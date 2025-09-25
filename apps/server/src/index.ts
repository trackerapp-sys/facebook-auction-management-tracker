import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import session from 'express-session';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

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

const app = express();
const port = Number(process.env.PORT) || 4000;

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
const SERVER_BASE_URL = process.env.SERVER_BASE_URL || `http://localhost:${port}`;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const FACEBOOK_REDIRECT_URI =
  process.env.FACEBOOK_REDIRECT_URI || `${SERVER_BASE_URL}/auth/facebook/callback`;
const FACEBOOK_OAUTH_SCOPES = (process.env.FACEBOOK_OAUTH_SCOPES ||
  'public_profile,groups_access_member_info,pages_manage_posts,pages_read_engagement'
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
    origin: CLIENT_ORIGIN,
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
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'lax',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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

  const { type, itemName, description, groupId, reservePrice, startingPrice } = req.body as Record<string, unknown>;

  if (!groupId || typeof groupId !== 'string') {
    res.status(400).json({ error: 'groupId is required' });
    return;
  }

  if (!itemName || typeof itemName !== 'string') {
    res.status(400).json({ error: 'itemName is required' });
    return;
  }

  if (type !== 'post' && type !== 'live') {
    res.status(400).json({ error: 'type must be "post" or "live"' });
    return;
  }

  const safeDescription = typeof description === 'string' ? description : '';

  try {
    if (type === 'post') {
      const postUrl = new URL(`https://graph.facebook.com/v19.0/${groupId}/feed`);
      const message = `${itemName}\nReserve: ${reservePrice ?? '—'}\nStarting: ${startingPrice ?? '—'}\n\n${safeDescription}`;

      const body = new URLSearchParams();
      body.set('message', message);
      body.set('access_token', auth.accessToken);

      const postResponse = await fetch(postUrl, {
        method: 'POST',
        body
      });
      const postPayload = await postResponse.json();

      if (!postResponse.ok) {
        const { error: graphError } = postPayload as { error?: GraphError };
        throw new Error(graphError?.message || 'Failed to publish post');
      }

      res.json({
        auctionId: postPayload.id,
        status: 'scheduled',
        platformReference: postPayload.id,
        message: 'Post published to Facebook group feed.'
      });
      return;
    }

    // Live auction placeholder
    res.json({
      auctionId: `live-${Date.now()}`,
      status: 'scheduled',
      message: 'Live auction creation via Graph API not yet implemented.'
    });
  } catch (err) {
    console.error('Error scheduling auction', err);
    res.status(502).json({ error: 'Unable to schedule auction with Facebook' });
  }
});

app.listen(port, () => {
  console.log(`API listening on port ${port}`);
  console.log(`Client origin: ${CLIENT_ORIGIN}`);
  console.log(`Facebook redirect URI: ${FACEBOOK_REDIRECT_URI}`);
});
