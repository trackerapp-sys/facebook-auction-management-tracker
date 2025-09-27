
import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { processBids } from './bidding';
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
  userId: string;
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

    // Matches group posts: /groups/{groupId}/posts/{postId}/
    const groupPostMatch = path.match(/\/groups\/\d+\/posts\/(\d+)/);
    if (groupPostMatch && groupPostMatch[1]) {
      return groupPostMatch[1];
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
    if (storyFbidMatch) {
      return storyFbidMatch;
    }

    return null;
  } catch (error) {
    console.error('Invalid URL provided to extractGraphPostIdFromUrl:', urlString);
    return null;
  }
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true }); // Important: We'll handle upgrades manually
const sseClients = new Set<Response>();

function broadcastSSE(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((client) => client.write(message));
}

wss.on('connection', (ws) => {
  console.log('Client connected via WebSocket');
  ws.on('close', () => console.log('Client disconnected from WebSocket'));
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
  'public_profile,pages_show_list,pages_manage_metadata,pages_read_engagement'
)
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
app.use(sessionParser);

app.get('/health', (_req, res) => {
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

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export { app, server, wss, sseClients, broadcastSSE };
