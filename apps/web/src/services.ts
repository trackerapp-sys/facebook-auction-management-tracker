import { AuctionDraft, FacebookAuthState, FacebookGroup } from './state';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SESSION_POLL_INTERVAL = 2000;
const SESSION_POLL_TIMEOUT = 120000;

type AuctionResponse = {
  auctionId: string;
  status: string;
  platformReference?: string;
  message?: string;
};

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers
  });

  if (!response.ok) {
    let details = 'Request failed';
    try {
      const payload = await response.json();
      details = payload.error ?? JSON.stringify(payload);
    } catch (_err) {
      // ignore parsing error
    }
    throw new Error(details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function loginWithFacebook(): Promise<FacebookAuthState> {
  if (typeof window === 'undefined') {
    throw new Error('Facebook login is only available in the browser.');
  }

  const { authUrl } = await apiFetch<{ authUrl: string }>('/auth/facebook/url');
  const popup = window.open(authUrl, 'facebookLogin', 'width=600,height=720');

  if (!popup) {
    throw new Error('Popup blocked. Please allow popups for this site.');
  }

  return new Promise<FacebookAuthState>((resolve, reject) => {
    const start = Date.now();

    const poll = async () => {
      if (Date.now() - start > SESSION_POLL_TIMEOUT) {
        popup.close();
        reject(new Error('Facebook login timed out.'));
        return;
      }

      try {
        const session = await checkFacebookSession();
        if (session.isAuthenticated) {
          popup.close();
          resolve(session);
          return;
        }
      } catch (err) {
        console.warn('Session poll failed', err);
      }

      if (popup.closed) {
        reject(new Error('Facebook login window was closed before completion.'));
        return;
      }

      window.setTimeout(poll, SESSION_POLL_INTERVAL);
    };

    poll();
  });
}

export async function checkFacebookSession(): Promise<FacebookAuthState> {
  try {
    return await apiFetch<FacebookAuthState>('/auth/facebook/session');
  } catch (err) {
    console.error('Failed to check Facebook session', err);
    return { isAuthenticated: false };
  }
}

export async function fetchUserGroups(): Promise<FacebookGroup[]> {
  return apiFetch<FacebookGroup[]>('/facebook/groups');
}

export async function scheduleAuction(draft: AuctionDraft): Promise<AuctionResponse> {
  return apiFetch<AuctionResponse>('/auctions', {
    method: 'POST',
    body: JSON.stringify({
      id: draft.id,
      type: draft.type,
      itemName: draft.itemName,
      description: draft.description,
      groupId: draft.groupId,
      reservePrice: draft.reservePrice,
      startingPrice: draft.startingPrice,
      bidIncrement: draft.bidIncrement,
      autoCloseMinutes: draft.autoCloseMinutes,
      intervalBetweenItems: draft.intervalBetweenItems
    })
  });
}

export async function logoutOfFacebook() {
  await apiFetch<{ success: boolean }>('/auth/facebook/logout', { method: 'POST' });
}
