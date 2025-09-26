const API_BASE_URL = 'https://facebook-auction-api.onrender.com';

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
