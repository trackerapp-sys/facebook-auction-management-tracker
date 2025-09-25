# Architecture Overview

## Goals
- Provide a responsive web application for managing Facebook group auctions and live-feed auctions
- Support guided onboarding for new users to configure business profile, auction settings, and integrations
- Enable integration with Facebook Graph API for authentication, group selection, and bid monitoring

## High-Level Components
1. **Client (React + TypeScript + Vite)**
   - Onboarding wizard for initial setup (profile, preferences, inventory, payment methods)
   - Auction workspace with auction-type selector (post vs live), group selector, item editor, and bid dashboard
   - Facebook login button leveraging OAuth flow and returning access tokens via backend
   - Real-time bid updates via WebSocket connection to backend auction stream service

2. **Server (Node.js + Express)**
   - Authentication endpoints handling OAuth redirect, token exchange, and secure token storage
   - REST endpoints for CRUD operations on inventory, auctions, and settings
   - Webhook receiver for Facebook updates (e.g., live comments) and event processing pipeline
   - WebSocket gateway broadcasting bid updates and auction state changes to connected clients

3. **Persistence Layer**
   - Placeholder for database (e.g., PostgreSQL via Prisma) to store users, auctions, bids, inventory
   - Queue layer (e.g., Redis Streams) for buffering comment events from Facebook webhooks

## Integration Points
- Facebook Graph API for login, group listings, post publishing, live video comment ingestion
- Optional payment integrations (e.g., Stripe) for invoicing and settlement workflows

## Security & Compliance
- OAuth tokens stored encrypted server-side; client receives short-lived sessions (JWT + refresh tokens)
- Audit logs for bid updates, auction state transitions, and user actions
- Configurable rate limiting per user to stay within Facebook platform policies

## Next Steps
- Scaffold front-end onboarding wizard and auction workspace with mocked data
- Scaffold backend API surface with stub routes for Facebook auth and auction management
- Define data models (TypeScript interfaces + Prisma schema placeholder)
- Implement local persistence (e.g., SQLite) for rapid prototyping before scaling to managed DB
