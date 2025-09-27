/// <reference lib="dom" />
import { randomUUID } from 'node:crypto';
import http from 'http';
import { Socket } from 'net';
import session from 'express-session';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import type { Request, Response } from 'express';
import { processBids } from './bidding.js';
import type { FacebookComment } from './types';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    facebookAuth?: FacebookSession;
  }
}

interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
}

interface FacebookSession {
  accessToken: string;
  expiresAt: number;
  profile: FacebookUserProfile;
}

interface GraphError {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
}

function extractGraphPostIdFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const path = url.pathname;

    // Regex for various Facebook post URL formats
    const patterns = [
      /\/posts\/(\d+)/,
      /\/permalink\.php\?story_fbid=([\d_]+)/,
      /\/photo\.php\?fbid=([\d_]+)/,
      /\/photo\/\?fbid=([\d_]+)/,
      /\/videos\/([\d_]+)/,
      /\/story\.php\?story_fbid=([\d_]+)/,
      /\/groups\/\w+\/posts\/(\d+)/
    ];

    for (const pattern of patterns) {
      const match = path.match(pattern) || url.search.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Final check on the whole string for group post URLs like `groupid_postid`
    const groupPostMatch = urlString.match(/(\d+_\d+)/);
    if (groupPostMatch) {
      return groupPostMatch[0];
    }
  } catch (error) {
    console.error('Invalid URL provided to extractGraphPostIdFromUrl', error);
    return null;
  }
  return null;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const sseClients = new Set<Response>();

interface Auction {
  id: string;
  postUrl: string;
  endDateTime?: string;
  startingPrice: number;
  bidIncrement: number;
  currentBid?: number;
  leadingBidder?: string;
}

const AUCTIONS = new Map<string, Auction>();

function broadcastSSE(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.write(payload);
  });
}
 
async function fetchCommentsFromGraph(postId: string): Promise<FacebookComment[]> {
  const token = PAGE_TOKENS.get(postId) || process.env.INGEST_TOKEN;
  if (!token) throw new Error('Missing ingest token');
  const url = `https://graph.facebook.com/v12.0/${postId}/comments?access_token=${token}&limit=500`;
  const resp = await fetch(url);
  if (!resp.ok) {
    const errorData = await resp.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Failed to fetch comments');
  }
  const data = await resp.json();
  return data.data as FacebookComment[];
}

wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
  // The `req` object here has been processed by middleware, so `session` is available.
  // @ts-expect-error - session property is added by express-session middleware
  if (!req.session?.facebookAuth) {
    console.log('WebSocket connection rejected: No active session.');
    ws.close(1008, 'User not authenticated');
    return;
  }

  console.log('Client connected to WebSocket');
  ws.on('message', (message) => {
    console.log('received: %s', message);
  });
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
  });
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const port = Number(process.env.PORT) || 4000;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const INGEST_TOKEN = process.env.INGEST_TOKEN;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
// Cache Page access tokens in-memory for webhook-related operations
const PAGE_TOKENS = new Map<string, string>();
const CORS_ADDITIONAL_ORIGINS = (process.env.CORS_ADDITIONAL_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_ALLOWED_ORIGINS = [
  CLIENT_ORIGIN,
  'https://facebook-auction-app.onrender.com',
  'https://facebook-group-auction-tracker-app.onrender.com',
  'https://www.facebook.com',
  'https://facebook.com',
  'https://m.facebook.com'
];
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...CORS_ADDITIONAL_ORIGINS]);
const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI || `${SERVER_BASE_URL}/auth/facebook/callback`;
const FACEBOOK_OAUTH_SCOPES = (process.env.FACEBOOK_OAUTH_SCOPES ||
  // Include Page permissions to enable webhooks for instant updates
  'public_profile,pages_show_list,pages_manage_metadata,pages_read_engagement')
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
  console.warn('Facebook app credentials missing. OAuth routes will return 500 until configured.');
}

app.set('trust proxy', 1);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (ALLOWED_ORIGINS.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin ' + origin + ' not allowed by CORS'));
    },
    credentials: true
  })
);
app.use(express.json());

const sessionMiddleware = session({
  name: 'auction.sid',
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
});

app.use(sessionMiddleware);

app.get('/auth/session', (req, res) => {
  if (req.session.facebookAuth) {
    res.json({ authenticated: true, user: req.session.facebookAuth.profile });
  } else {
    res.json({ authenticated: false });
  }
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/webhook/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified');
    res.status(200).send(challenge);
  } else {
    console.error('Failed validation. Make sure the validation tokens match.');
    res.sendStatus(403);
  }
});

app.post('/webhook/facebook', (req, res) => {
  console.log('Facebook webhook event received:', JSON.stringify(req.body, null, 2));

  // Broadcast the event to all connected clients (WebSocket)
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body));
    }
  });

  // Broadcast to SSE clients
  broadcastSSE(req.body);

  res.sendStatus(200);
});

app.post('/auctions', async (req: Request, res: Response) => {
  const { postUrl, endDateTime, startingPrice = 0, bidIncrement = 1 } = req.body;
  const auctionId = randomUUID();
  AUCTIONS.set(auctionId, { id: auctionId, postUrl, endDateTime, startingPrice, bidIncrement });
  let currentBid = startingPrice;
  let leadingBidder = '';
  if (postUrl) {
    const postId = extractGraphPostIdFromUrl(postUrl);
    if (postId) {
      try {
        const comments = await fetchCommentsFromGraph(postId);
        const result = processBids(comments);
        currentBid = result.currentBid;
        leadingBidder = result.leadingBidder;
      } catch (err) {
        console.error('Error processing initial bids:', err);
      }
    }
  }
  res.json({ auctionId, startDateTime: new Date().toISOString(), endDateTime, currentBid, leadingBidder, message: 'Auction scheduled successfully' });
});

app.get('/auctions/by-url', async (req: Request, res: Response) => {
  const { url } = req.query as Record<string, string>;
  if (!url) {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  const id = extractGraphPostIdFromUrl(url);
  if (!id) {
    res.status(400).json({ error: 'Invalid Facebook post URL' });
    return;
  }

  const isValidId = /^\d+(_\d+)?$/.test(id);
  if (!isValidId) {
    res.status(400).json({ error: 'Invalid Facebook post ID format' });
    return;
  }

  try {
    const comments = await fetchCommentsFromGraph(id);
    const result = processBids(comments);
    res.json({
      id,
      postUrl: url,
      currentBid: result.currentBid,
      leadingBidder: result.leadingBidder
    });
  } catch (error) {
    console.error('Error processing bids:', error);
    res.status(500).json({ error: 'Failed to fetch or process bids', details: (error as Error).message });
  }
});

app.get('/auctions/:auctionId', async (req: Request, res: Response) => {
  const { auctionId } = req.params;
  const auction = AUCTIONS.get(auctionId);
  if (!auction) {
    res.status(404).json({ error: 'Auction not found' });
    return;
  }
  const { postUrl, endDateTime, startingPrice } = auction;
  let currentBid = startingPrice;
  let leadingBidder = '';
  if (postUrl) {
    const postId = extractGraphPostIdFromUrl(postUrl);
    if (postId) {
      try {
        const comments = await fetchCommentsFromGraph(postId);
        const result = processBids(comments);
        currentBid = result.currentBid;
        leadingBidder = result.leadingBidder;
      } catch (err) {
        console.error('Error fetching bids:', err);
      }
    }
  }
  res.json({ auctionId, startDateTime: new Date().toISOString(), endDateTime, currentBid, leadingBidder });
});

app.post('/auctions/ingest', async (req: Request, res: Response) => {
  const { postUrl, currentBid, leadingBidder } = req.body;
  if (!postUrl) {
    res.status(400).json({ error: 'Missing postUrl' });
    return;
  }

  const postId = extractGraphPostIdFromUrl(postUrl);
  if (!postId) {
    res.status(400).json({ error: 'Invalid postUrl' });
    return;
  }

  try {
    // Find or create auction
    let auction = Array.from(AUCTIONS.values()).find(a => a.postUrl === postUrl);
    if (!auction) {
      const auctionId = randomUUID();
      auction = {
        id: auctionId,
        postUrl,
        startingPrice: 0,
        bidIncrement: 1,
        currentBid: currentBid || 0,
        leadingBidder: leadingBidder || ''
      };
      AUCTIONS.set(auctionId, auction);
    } else {
      // Update existing auction
      auction.currentBid = currentBid || auction.currentBid || 0;
      auction.leadingBidder = leadingBidder || auction.leadingBidder || '';
    }

    // Broadcast update via SSE
    broadcastSSE({
      type: 'auction_update',
      auctionId: auction.id,
      postUrl,
      currentBid: auction.currentBid,
      leadingBidder: auction.leadingBidder,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, auctionId: auction.id });
  } catch (error) {
    console.error('Error ingesting auction data:', error);
    res.status(500).json({ error: 'Failed to ingest auction data', details: (error as Error).message });
  }
});

// Handle WebSocket upgrades
server.on('upgrade', (request: http.IncomingMessage, socket: Socket, head: Buffer) => {
  const req = request as unknown as Request;
  const res = {} as Response;
  sessionMiddleware(req, res, () => {
    if (req.session && req.session.facebookAuth) {
      wss.handleUpgrade(request, socket, head, (ws: WebSocket) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
