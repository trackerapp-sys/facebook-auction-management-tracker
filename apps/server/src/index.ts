
import { randomUUID } from 'node:crypto';
import http from 'http';
import session from 'express-session';
import { WebSocketServer, WebSocket } from 'ws';
import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import type { Request, Response } from 'express';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    facebookAuth?: FacebookSession;
  }
}

// Add this to handle the upgrade request
declare module 'http' {
  interface IncomingMessage {
    session: session.Session & Partial<session.SessionData>;
  }
}

interface FacebookUserProfile {
  id: string;
  name: string;
  email?: string;
}

interface FacebookSession {
  accessToken: string;
  userId: string;
  profile: FacebookUserProfile;
}

interface GraphError {
  message: string;
  type: string;
  code: number;
  fbtrace_id: string;
}

interface FacebookComment {
  from?: {
    name: string;
  };
  message: string;
}

function extractGraphPostIdFromUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const path = url.pathname;

    // Matches group posts: /groups/{groupId}/posts/{postId}/ or /groups/{groupId}/permalink/{postId}/
    const groupPostMatch = path.match(/\/groups\/[^/]+\/(?:posts|permalink)\/(\d+)/);
    if (groupPostMatch && groupPostMatch[1]) {
      const groupId = path.split('/')[2];
      return `${groupId}_${groupPostMatch[1]}`;
    }

    // Matches user posts: /{username}/posts/{postId}
    // Matches page posts: /{pagename}/posts/{postId}
    const userPostMatch = path.match(/\/(?:[^/]+)\/posts\/(\d+)/);
    if (userPostMatch && userPostMatch[1]) {
      return userPostMatch[1];
    }

    // Matches photo URLs which can also be posts: /photo.php?fbid={postId}
    const photoFbidMatch = url.searchParams.get('fbid');
    if (photoFbidMatch) {
      return photoFbidMatch;
    }

    // Matches permalink URLs: /permalink.php?story_fbid={postId}&id={pageId}
    const storyFbidMatch = url.searchParams.get('story_fbid');
    const pageId = url.searchParams.get('id');
    if (storyFbidMatch && pageId) {
      return `${pageId}_${storyFbidMatch}`;
    }

    return null;
  } catch (error) {
    console.error('Invalid URL provided to extractGraphPostIdFromUrl:', urlString);
    return null;
  }
}

function calculateBids(comments: FacebookComment[]) {
  let currentBid = 0;
  let leadingBidder = '';

  for (const comment of comments) {
    const bidMatch = comment.message.match(/\d+/);
    if (bidMatch) {
      const bid = parseInt(bidMatch[0], 10);
      if (bid > currentBid) {
        currentBid = bid;
        leadingBidder = comment.from?.name || 'Unknown Bidder';
      }
    }
  }
  return { currentBid, leadingBidder };
}

async function processBids(postId: string) {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('Facebook access token not configured');
  }

  const apiUrl = `https://graph.facebook.com/v20.0/${postId}/comments?access_token=${accessToken}&fields=message,from{name}&limit=100`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch comments: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const comments: FacebookComment[] = data.data || [];

    const { currentBid, leadingBidder } = calculateBids(comments);

    return {
      postId,
      currentBid,
      leadingBidder,
      totalComments: comments.length
    };
  } catch (error) {
    console.error('Error processing bids:', error);
    throw error;
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Use noServer to handle upgrades manually
const sseClients = new Set<Response>();

function broadcast(data: unknown) {
  const message = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  broadcastSSE(data);
}

function broadcastSSE(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => {
    client.write(message);
  });
}

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
  ws.on('error', (error) => console.error('WebSocket error:', error));
});

const port = Number(process.env.PORT) || 4000;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const INGEST_TOKEN = process.env.INGEST_TOKEN;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
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
  'public_profile,pages_show_list,pages_manage_metadata,pages_read_engagement'
)
  .split(',')
  .map((scope) => scope.trim())
  .filter(Boolean);

if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
  console.warn('Facebook app credentials missing. OAuth routes will return 500 until configured.');
}

const sessionParser = session({
  name: 'auction.sid',
  secret: process.env.SESSION_SECRET || 'change-me-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
});

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
app.use(sessionParser); // Use the session parser for HTTP requests

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.add(res);
  console.log('Client connected via SSE');

  req.on('close', () => {
    sseClients.delete(res);
    console.log('Client disconnected from SSE');
  });
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

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(req.body));
    }
  });
  broadcastSSE(req.body);
  res.sendStatus(200);
});

app.get('/auth/facebook', (req, res) => {
  const state = randomUUID();
  req.session.oauthState = state;

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_APP_ID!);
  authUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', FACEBOOK_OAUTH_SCOPES.join(','));

  res.redirect(authUrl.toString());
});

app.get('/auth/facebook/callback', async (req, res) => {
  const { code, state } = req.query;

  if (typeof state !== 'string' || state !== req.session.oauthState) {
    return res.status(403).send('Invalid state parameter');
  }
  delete req.session.oauthState;

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID!);
  tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET!);
  tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  tokenUrl.searchParams.set('code', code as string);

  try {
    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      throw new Error(tokenData.error.message);
    }

    const accessToken = tokenData.access_token;
    const userId = tokenData.user_id;

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('access_token', accessToken);
    profileUrl.searchParams.set('fields', 'id,name,email');

    const profileResponse = await fetch(profileUrl.toString());
    const profileData = await profileResponse.json();

    if (profileData.error) {
      throw new Error(profileData.error.message);
    }

    req.session.facebookAuth = {
      accessToken,
      userId,
      profile: profileData
    };

    res.redirect(CLIENT_ORIGIN);
  } catch (error) {
    console.error('Error during Facebook OAuth callback:', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/auctions/by-url', async (req: Request, res: Response) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    res.status(500).json({ error: 'Facebook app credentials not configured' });
    return;
  }

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
    const result = await processBids(id);
    res.json(result);
  } catch (error) {
    console.error('Error processing bids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle WebSocket upgrades
server.on('upgrade', (request, socket, head) => {
  sessionParser(request, {} as any, () => {
    if (request.session && request.session.facebookAuth) {
      wss.handleUpgrade(request, socket, head, (ws) => {
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

export { app, server, wss, sseClients, broadcastSSE };
