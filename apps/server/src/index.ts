import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    facebookAuth?: FacebookSession;
  }
}

interface FacebookUserProfile {
  id: string;
  name: string;
}

interface FacebookSession {
  accessToken: string;
  tokenType: string;
  expiresAt: number;
  user: FacebookUserProfile;
}

interface GraphError {
  message: string;
  type?: string;
  code?: number;
  error_subcode?: number;
}

function extractGraphPostIdFromUrl(urlString: string): string | null {
  try {
    const u = new URL(urlString);
    const parts = u.pathname.split('/').filter(Boolean);

    // Match /groups/{groupId}/posts/{postId}
    const groupsIdx = parts.indexOf('groups');
    const postsIdx = parts.indexOf('posts');
    if (groupsIdx !== -1 && postsIdx !== -1 && parts[groupsIdx + 1] && parts[postsIdx + 1]) {
      const groupId = parts[groupsIdx + 1];
      const postId = parts[postsIdx + 1];
      if (/^\d+$/.test(groupId) && /^\d+$/.test(postId)) {
        return `${groupId}_${postId}`;
      }
    }

    // Match permalink/{postId} or posts/{postId}
    const permalinkIdx = parts.indexOf('permalink');
    if (permalinkIdx !== -1 && parts[permalinkIdx + 1] && /^\d+$/.test(parts[permalinkIdx + 1])) {
      return parts[permalinkIdx + 1];
    }
    if (postsIdx !== -1 && parts[postsIdx + 1] && /^\d+$/.test(parts[postsIdx + 1])) {
      return parts[postsIdx + 1];
    }
  } catch {
    // ignore parse errors
  }
  return null;
}

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const sseClients = new Set<Response>();

function broadcastSSE(data: unknown) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(payload);
    } catch (e) {
      // drop broken client
      sseClients.delete(res);
    }
  }
}

wss.on('connection', (ws) => {
  console.log('Client connected');
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const port = Number(process.env.PORT) || 4000;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const CORS_ADDITIONAL_ORIGINS = (process.env.CORS_ADDITIONAL_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const DEFAULT_ALLOWED_ORIGINS = [
  CLIENT_ORIGIN,
  'https://facebook-auction-app.onrender.com',
  'https://facebook-group-auction-tracker-app.onrender.com',
  'https://www.facebook.com',
  'https://facebook.com'
];
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS, ...CORS_ADDITIONAL_ORIGINS]);
const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI || `${SERVER_BASE_URL}/auth/facebook/callback`;
const FACEBOOK_OAUTH_SCOPES = (process.env.FACEBOOK_OAUTH_SCOPES ||
  'public_profile'
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
app.use(
  session({
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
  })
);

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

app.get('/auctions/:id', async (req: Request, res: Response) => {
  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    res.status(500).json({ error: 'Facebook app credentials not configured' });
    return;
  }

  const { id } = req.params;
  const isValidId = /^\d+(_\d+)?$/.test(id);
  if (!isValidId) {
    res.status(400).json({ error: 'Invalid auction id. Provide a numeric Facebook post ID (e.g., 1234567890 or groupId_postId).' });
    return;
  }
  const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  const auth = req.session.facebookAuth;
  const accessToken = auth?.accessToken || appAccessToken;

  try {
    const graphUrl = new URL(`https://graph.facebook.com/v19.0/${id}/comments`);
    graphUrl.searchParams.set('access_token', accessToken);

    const graphResponse = await fetch(graphUrl);
    const graphPayload = await graphResponse.json();

    if (!graphResponse.ok) {
      const { error: graphError } = graphPayload as { error?: GraphError };
      const message = graphError?.message || 'Failed to load comments';
      console.error('Graph API error', { status: graphResponse.status, message, details: graphError });
      res.status(graphResponse.status).json({ error: message });
      return;
    }

    const { data } = graphPayload as { data: Array<{ from?: { name: string }; message: string }> };

    let currentBid = 0;
    let leadingBidder = '';

    for (const comment of data) {
      const bidMatch = comment.message.match(/\d+/);
      if (bidMatch) {
        const bid = parseInt(bidMatch[0], 10);
        if (bid > currentBid) {
          currentBid = bid;
          leadingBidder = comment.from?.name || '';
        }
      }
    }

    res.json({ currentBid, leadingBidder });
  } catch (err) {
    console.error('Error fetching auction details', err);
    res.status(502).json({ error: 'Unable to fetch auction details from Facebook' });
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
    res.status(400).json({ error: 'Invalid derived post id' });
    return;
  }

  const appAccessToken = `${FACEBOOK_APP_ID}|${FACEBOOK_APP_SECRET}`;
  const auth = req.session.facebookAuth;
  const accessToken = auth?.accessToken || appAccessToken;

  try {
    const graphUrl = new URL(`https://graph.facebook.com/v19.0/${id}/comments`);
    graphUrl.searchParams.set('access_token', accessToken);

    const graphResponse = await fetch(graphUrl);
    const graphPayload = await graphResponse.json();

    if (!graphResponse.ok) {
      const { error: graphError } = graphPayload as { error?: GraphError };
      const message = graphError?.message || 'Failed to load comments';
      console.error('Graph API error', { status: graphResponse.status, message, details: graphError });
      res.status(graphResponse.status).json({ error: message });
      return;
    }

    const { data } = graphPayload as { data: Array<{ from?: { name: string }; message: string }> };

    let currentBid = 0;
    let leadingBidder = '';

    for (const comment of data) {
      const bidMatch = comment.message.match(/\d+/);
      if (bidMatch) {
        const bid = parseInt(bidMatch[0], 10);
        if (bid > currentBid) {
          currentBid = bid;
          leadingBidder = comment.from?.name || '';
        }
      }
    }

    res.json({ currentBid, leadingBidder });
  } catch (err) {
    console.error('Error fetching auction details', err);
    res.status(502).json({ error: 'Unable to fetch auction details from Facebook' });
  }
});

app.get('/auth/facebook/url', (req: Request, res: Response) => {
  if (!FACEBOOK_APP_ID) {
    res.status(500).json({ error: 'Facebook app ID not configured' });
    return;
  }

  const state = randomUUID();
  req.session.oauthState = state;

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
  authUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', FACEBOOK_OAUTH_SCOPES.join(','));
  authUrl.searchParams.set('state', state);

  res.json({ authUrl: authUrl.toString() });
});

app.get('/auth/facebook/callback', async (req: Request, res: Response) => {
  const { state, code, error, error_description: errorDescription } = req.query as Record<string, string>;

  if (error) {
    console.error('Facebook OAuth error', { error, errorDescription });
    res.redirect(`${CLIENT_ORIGIN}/auth/facebook?error=${encodeURIComponent(errorDescription ?? error)}`);
    return;
  }

  if (!state || state !== req.session.oauthState) {
    res.redirect(`${CLIENT_ORIGIN}/auth/facebook?error=invalid_state`);
    return;
  }

  if (!code) {
    res.redirect(`${CLIENT_ORIGIN}/auth/facebook?error=missing_code`);
    return;
  }

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    res.redirect(`${CLIENT_ORIGIN}/auth/facebook?error=server_config`);
    return;
  }

  try {
    const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', FACEBOOK_APP_ID);
    tokenUrl.searchParams.set('client_secret', FACEBOOK_APP_SECRET);
    tokenUrl.searchParams.set('redirect_uri', FACEBOOK_REDIRECT_URI);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl);
    const tokenPayload = await tokenResponse.json();

    if (!tokenResponse.ok) {
      const { error: graphError } = tokenPayload as { error?: GraphError };
      throw new Error(graphError?.message || 'Failed to exchange code for access token');
    }

    const { access_token: accessToken, token_type: tokenType, expires_in: expiresIn } = tokenPayload as {
      access_token: string;
      token_type: string;
      expires_in: number;
    };

    if (!accessToken) {
      throw new Error('Access token missing in response');
    }

    const profileUrl = new URL('https://graph.facebook.com/me');
    profileUrl.searchParams.set('fields', 'id,name');
    profileUrl.searchParams.set('access_token', accessToken);

    const profileResponse = await fetch(profileUrl);
    const profilePayload = await profileResponse.json();

    if (!profileResponse.ok) {
      const { error: graphError } = profilePayload as { error?: GraphError };
      throw new Error(graphError?.message || 'Failed to fetch user profile');
    }

    const user = profilePayload as FacebookUserProfile;
    req.session.facebookAuth = {
      accessToken,
      tokenType,
      expiresAt: Date.now() + expiresIn * 1000,
      user
    };

    delete req.session.oauthState;

    res.redirect(`${CLIENT_ORIGIN}/auth/facebook/complete`);
  } catch (err) {
    console.error('Facebook OAuth callback failure', err);
    res.redirect(`${CLIENT_ORIGIN}/auth/facebook?error=auth_failed`);
  }
});

app.get('/auth/facebook/session', (req: Request, res: Response) => {
  const auth = req.session.facebookAuth;
  if (!auth) {
    res.json({ isAuthenticated: false });
    return;
  }

  res.json({
    isAuthenticated: true,
    userName: auth.user.name,
    userId: auth.user.id,
    expiresAt: new Date(auth.expiresAt).toISOString()
  });
});

app.post('/auth/facebook/logout', (req: Request, res: Response) => {
  req.session.facebookAuth = undefined;
  res.json({ success: true });
});

app.get('/facebook/groups', async (req: Request, res: Response) => {
  const auth = req.session.facebookAuth;
  if (!auth) {
    res.status(401).json({ error: 'Not authenticated with Facebook' });
    return;
  }

  try {
    const graphUrl = new URL('https://graph.facebook.com/v19.0/me/groups');
    graphUrl.searchParams.set('fields', 'id,name,privacy,member_count');
    graphUrl.searchParams.set('access_token', auth.accessToken);

    const graphResponse = await fetch(graphUrl);
    const graphPayload = await graphResponse.json();

    if (!graphResponse.ok) {
      const { error: graphError } = graphPayload as { error?: GraphError };
      throw new Error(graphError?.message || 'Failed to load groups');
    }

    const { data } = graphPayload as { data: Array<{ id: string; name: string; privacy: string; member_count?: number }> };

    res.json(
      data.map((group) => ({
        id: group.id,
        name: group.name,
        privacy: (group.privacy || 'private').toLowerCase(),
        memberCount: group.member_count ?? 0
      }))
    );
  } catch (err) {
    console.error('Error fetching Facebook groups', err);
    res.status(502).json({ error: 'Unable to fetch groups from Facebook' });
  }
});

app.post('/auctions', async (req: Request, res: Response) => {
  const auth = req.session.facebookAuth;
  if (!auth) {
    res.status(401).json({ error: 'Not authenticated with Facebook' });
    return;
  }

  const {
    type,
    itemName,
    description,
    groupId,
    groupUrl,
    reservePrice,
    startingPrice,
    startDateTime,
    endDateTime,
    durationMinutes,
    caratWeight,
    gramWeight,
    postUrl,
    autoCloseMinutes,
    intervalBetweenItems
  } = req.body as Record<string, unknown>;

  const normalizedGroupId = typeof groupId === 'string' ? groupId.trim() : '';
  const normalizedGroupUrl = typeof groupUrl === 'string' ? groupUrl.trim() : '';
  const normalizedPostUrl = typeof postUrl === 'string' ? postUrl.trim() : '';
  const hasGroupId = normalizedGroupId.length > 0;
  const hasGroupUrl = normalizedGroupUrl.length > 0;

  if (!hasGroupId && !hasGroupUrl) {
    res.status(400).json({ error: 'Provide a Facebook group or group URL' });
    return;
  }

  if (!itemName || typeof itemName !== 'string') {
    res.status(400).json({ error: 'itemName is required' });
    return;
  }

  if (type !== 'post' && type !== 'live') {
    res.status(400).json({ error: "type must be 'post' or 'live'" });
    return;
  }

  if (type === 'post') {
    if (!startDateTime || typeof startDateTime !== 'string') {
      res.status(400).json({ error: 'startDateTime is required for post auctions' });
      return;
    }

    if (!endDateTime || typeof endDateTime !== 'string') {
      res.status(400).json({ error: 'endDateTime is required for post auctions' });
      return;
    }
  }

  const safeDescription = typeof description === 'string' ? description : '';

  const formatCurrencyField = (input: unknown) => {
    const numeric =
      typeof input === 'number'
        ? input
        : typeof input === 'string'
        ? Number(input)
        : Number.NaN;
    if (!Number.isNaN(numeric)) {
      return numeric.toFixed(2);
    }
    return '--';
  };

  const parseNumber = (input: unknown): number | undefined => {
    if (typeof input === 'number') {
      return Number.isNaN(input) ? undefined : input;
    }

    if (typeof input === 'string' && input.trim() !== '') {
      const parsed = Number(input);
      return Number.isNaN(parsed) ? undefined : parsed;
    }

    return undefined;
  };

  try {
    if (type === 'post') {
      if (!hasGroupId) {
        res.json({
          auctionId: `manual-${Date.now()}`,
          status: 'scheduled',
          message:
            'Facebook permissions do not allow automatic posting yet. Publish manually in Facebook and add the post URL for tracking.',
          startDateTime,
          endDateTime,
          durationMinutes: parseNumber(durationMinutes),
          caratWeight: parseNumber(caratWeight),
          gramWeight: parseNumber(gramWeight),
          groupUrl: hasGroupUrl ? normalizedGroupUrl : undefined,
          postUrl: normalizedPostUrl || undefined
        });
        return;
      }

      const postRequestUrl = new URL(`https://graph.facebook.com/v19.0/${normalizedGroupId}/feed`);
      const message = `${itemName}\nReserve: ${formatCurrencyField(reservePrice)}\nStarting: ${formatCurrencyField(startingPrice)}\n\n${safeDescription}`;

      const body = new URLSearchParams();
      body.set('message', message);
      body.set('access_token', auth.accessToken);

      const postResponse = await fetch(postRequestUrl, {
        method: 'POST',
        body
      });
      const postPayload = await postResponse.json();

      if (!postResponse.ok) {
        const { error: graphError } = postPayload as { error?: GraphError };
        throw new Error(graphError?.message || 'Failed to publish post');
      }

      const fallbackPostUrl = `https://www.facebook.com/groups/${normalizedGroupId}/posts/${postPayload.id}/`;

      res.json({
        auctionId: postPayload.id,
        status: 'scheduled',
        platformReference: postPayload.id,
        message: 'Post published to Facebook group feed.',
        startDateTime,
        endDateTime,
        durationMinutes: parseNumber(durationMinutes),
        caratWeight: parseNumber(caratWeight),
        gramWeight: parseNumber(gramWeight),
        groupUrl: hasGroupUrl ? normalizedGroupUrl : undefined,
        postUrl: normalizedPostUrl || fallbackPostUrl
      });
      return;
    }

    const liveAutoClose = parseNumber(autoCloseMinutes) ?? 60;
    const liveInterval = parseNumber(intervalBetweenItems) ?? 4;

    res.json({
      auctionId: `live-${Date.now()}`,
      status: 'scheduled',
      message: 'Live auction creation via Graph API not yet implemented.',
      autoCloseMinutes: liveAutoClose,
      intervalBetweenItems: liveInterval,
      caratWeight: parseNumber(caratWeight),
      gramWeight: parseNumber(gramWeight),
      groupUrl: hasGroupUrl ? normalizedGroupUrl : undefined,
      postUrl: normalizedPostUrl || undefined
    });
  } catch (err) {
    console.error('Error scheduling auction', err);
    res.status(502).json({ error: 'Unable to schedule auction with Facebook' });
  }
});

app.get('/events', (req: Request, res: Response) => {
  // CORS is already applied globally; just set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  // initial comment to open stream
  res.write(': connected\n\n');

  // keepalive pings
  const interval = setInterval(() => {
    try {
      res.write(`event: ping\n`);
      res.write(`data: {"ts": ${Date.now()}}\n\n`);
    } catch {
      clearInterval(interval);
    }
  }, 25000);

  // track client
  sseClients.add(res);

  req.on('close', () => {
    clearInterval(interval);
    sseClients.delete(res);
    try { res.end(); } catch {}
  });
});

server.listen(port, () => {
  console.log(`API listening on port ${port}`);
  console.log(`Client origin: ${CLIENT_ORIGIN}`);
  console.log(`Facebook redirect URI: ${FACEBOOK_REDIRECT_URI}`);
});
