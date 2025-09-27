
import type { FacebookComment } from './types';

/**
 * Extracts a bid amount from a comment message.
 * It looks for a number that might be a bid. The regex is designed to capture
 * standalone numbers, optionally preceded by a currency symbol.
 * It will match integers or decimals.
 *
 * @param message The comment text.
 * @returns The bid amount as a number, or null if no bid is found.
 */
function extractBidFromMessage(message: string): number | null {
  // Matches numbers, including decimals.
  // It will match: "150", "$150", "150.50", but not inside other words like "abc150"
  const bidMatch = message.match(/(?:\s|^)\$?(\d+(?:\.\d{1,2})?)\b/);
  if (bidMatch && bidMatch[1]) {
    const bid = parseFloat(bidMatch[1]);
    // Let's assume bids should be positive numbers.
    if (!isNaN(bid) && bid > 0) {
      return bid;
    }
  }
  return null;
}

/**
 * Processes a list of comments to find the highest bid and the leading bidder.
 *
 * @param comments An array of Facebook comments.
 * @returns An object with the current highest bid and the name of the leading bidder.
 */
export function processBids(comments: FacebookComment[]): { currentBid: number; leadingBidder: string } {
  let currentBid = 0;
  let leadingBidder = '';

  for (const comment of comments) {
    const bid = extractBidFromMessage(comment.message);
    if (bid !== null && bid > currentBid) {
      currentBid = bid;
      leadingBidder = comment.from?.name || 'Unknown Bidder';
    }
  }

  return { currentBid, leadingBidder };
}
