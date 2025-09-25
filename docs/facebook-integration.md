# Facebook Integration Roadmap

## OAuth + Permissions
- Register app within Meta for Developers, enable Facebook Login and Groups API permissions
- Implement OAuth redirect handler in `apps/server` exchanging code for access + long-lived tokens
- Request scopes: `groups_access_member_info`, `pages_manage_posts`, `pages_read_engagement`, `public_profile`
- Store tokens encrypted; refresh long-lived user tokens every 60 days

## Group Auction Workflows
- Fetch groups via `/me/groups` filtering for admin/moderator role
- Create auctions by publishing posts via `/group-id/feed`
- For live auctions, create live video sessions using `/group-id/live_videos`
- Persist Facebook post/video IDs to correlate incoming comments with auction lots

## Bid Monitoring
- Subscribe to Webhooks (`comments`, `live_videos`) for real-time bid ingestion
- Backfill comments using `/object-id/comments` with `order=chronological` for missed updates
- Normalize bids by extracting numeric values, bidder profile, timestamp, and comment permalink

## Live Auction Automation
- Maintain state machine for active lot, next lot queue, and interval timers
- Trigger reminders via Messenger or comment replies when lot is closing soon
- Auto-close auctions by locking comments or posting a closing announcement

## Compliance & Safety
- Respect Facebook Platform Terms; review rate limits and enforce per-user quotas
- Provide audit logs of automated actions and bidding decisions
- Offer manual override controls for moderators to pause automation mid-stream

## Next Implementation Steps
1. Wire front-end Facebook login button to backend OAuth endpoint
2. Implement group retrieval + caching with nightly refresh
3. Build bid ingestion pipeline (webhook receiver + queue + processor)
4. Surface real-time bid leaderboard UI with spectator view for moderators
5. Integrate payout workflows (invoice generation, payment tracking)
