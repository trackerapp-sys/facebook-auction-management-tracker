Auction Bid Scraper (Chrome/Edge Extension)

Purpose
- Scrape an open Facebook post (groups/permalink) in the logged-in browser to read comments and compute the current highest bid and leading bidder.
- Optional: send the result to your Auction Tracker API via POST /auctions/ingest with a pre-shared token.

Install (unpacked)
1. Build icons (or copy placeholders) into apps/extension (icon16.png, icon48.png, icon128.png)
2. Go to chrome://extensions (or edge://extensions)
3. Enable Developer mode
4. Load unpacked -> select apps/extension folder
5. Click the extension’s Options to set:
   - API Base URL
   - Ingest Token (matches your server’s INGEST_TOKEN)

Usage
- Open a Facebook group post (e.g., https://m.facebook.com/groups/<group>/permalink/<postId>)
- The overlay shows current highest bid, leading bidder, and two actions:
  - Copy JSON: copies { postUrl, currentBid, leadingBidder, ts }
  - Send to tracker: POSTs to API /auctions/ingest with token

Server configuration
- Set INGEST_TOKEN in your API environment.
- The server endpoint POST /auctions/ingest expects:
  - Headers: Authorization: Bearer <INGEST_TOKEN>
  - Body: { postUrl: string, currentBid: number, leadingBidder?: string }

Notes
- This uses simple DOM heuristics (m.facebook.com preferred). Large changes to Facebook’s markup may require updating selectors.
- Keep Facebook comments sorted by All/Newest to avoid missing bids hidden by relevance.
- The extension does not transmit Facebook credentials and only sends parsed results if you click Send to tracker.
