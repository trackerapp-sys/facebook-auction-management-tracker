const API_BASE_URL = (import.meta?.env?.VITE_API_BASE_URL) || 'https://facebook-auction-api.onrender.com';

export async function scheduleAuction(draft) {
  const response = await fetch(`${API_BASE_URL}/auctions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(draft),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to schedule auction');
  }

  return response.json();
}

export async function fetchBids(auctionId) {
  const response = await fetch(`${API_BASE_URL}/auctions/${auctionId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch bids');
  }

  return response.json();
}

export async function listPages() {
  const response = await fetch(`${API_BASE_URL}/facebook/pages`, {
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load pages');
  }
  return response.json();
}

export async function subscribePage(pageId) {
  const response = await fetch(`${API_BASE_URL}/facebook/pages/${pageId}/subscribe`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to subscribe page');
  }
  return response.json();
}

export async function fetchBidsByUrl(postUrl) {
  const url = new URL(`${API_BASE_URL}/auctions/by-url`);
  url.searchParams.set('url', postUrl);

  const response = await fetch(url.toString(), {
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to fetch bids');
  }

  return response.json();
}
