import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import type { AuctionDraft } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace, { type AuctionViewMode } from './components/AuctionWorkspace';
import Sidebar, { type SectionKey } from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import WelcomeScreen from './components/WelcomeScreen';
import Settings from './components/Settings';
import { fetchBids, fetchBidsByUrl } from './api';
import './App.css';

const WELCOME_ACK_KEY = 'auction-tracker-welcome';
const WEBSOCKET_URL = (import.meta.env.VITE_WEBSOCKET_URL as string) || 'wss://facebook-auction-api.onrender.com';
const SSE_URL = (import.meta.env.VITE_SSE_URL as string) || 'https://facebook-auction-api.onrender.com/events';

const splitDateTime = (value?: string): { date?: string; time?: string } => {
  if (!value) {
    return {};
  }

  return {
    date: value.slice(0, 10),
    time: value.slice(11, 16)
  };
};

function AppShell() {
  const {
    state: { profile, auctionDraft, previousAuctions },
    dispatch
  } = useAppState();
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [hasSeenWelcome, setHasSeenWelcome] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.localStorage.getItem(WELCOME_ACK_KEY) === 'true';
  });

  useEffect(() => {
    if (hasSeenWelcome && typeof window !== 'undefined') {
      window.localStorage.setItem(WELCOME_ACK_KEY, 'true');
    }
  }, [hasSeenWelcome]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let wsAttempt = 0;
    let closed = false;
    let wsTimer: number | undefined;
    let sse: EventSource | null = null;

    const handleMessage = (raw: string) => {
      try {
        const data = JSON.parse(raw);
        console.log('Realtime message received:', data);

        if (data.object === 'page' && data.entry) {
          for (const entry of data.entry) {
            for (const change of entry.changes) {
              if (change.field === 'feed' && change.value.item === 'comment') {
                const { post_id, from, message } = change.value;
                const auctionId = post_id;
                const leadingBidder = from.name;
                
                // Simple bid parsing: extract the first number from the message
                const bidMatch = message.match(/\d+/);
                if (bidMatch) {
                  const currentBid = parseInt(bidMatch[0], 10);
                  dispatch({ 
                    type: 'update-auction', 
                    payload: { id: auctionId, currentBid, leadingBidder } 
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error parsing realtime message:', error);
      }
    };

    const connectSSE = () => {
      if (closed) return;
      sse = new EventSource(SSE_URL, { withCredentials: true } as EventSourceInit);
      sse.onopen = () => console.log('Connected to SSE');
      sse.onmessage = (ev) => handleMessage(ev.data);
      sse.onerror = (ev) => {
        console.error('SSE error, will retry automatically:', ev);
      };
    };

    const connectWS = () => {
      if (closed) return;
      const url = `${WEBSOCKET_URL}${WEBSOCKET_URL.includes('?') ? '&' : '?'}t=${Date.now()}`;
      ws = new WebSocket(url);

      ws.onopen = () => {
        wsAttempt = 0;
        console.log('Connected to WebSocket server');
      };

      ws.onmessage = (event) => handleMessage(event.data);

      ws.onclose = (ev) => {
        console.log('Disconnected from WebSocket server', ev.code, ev.reason);
        if (closed) return;
        if (wsAttempt < 3) {
          const delay = Math.min(30000, 1000 * Math.pow(2, wsAttempt++));
          wsTimer = window.setTimeout(connectWS, delay);
        } else {
          console.warn('WebSocket failed repeatedly, falling back to SSE');
          connectSSE();
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
      };
    };

    connectWS();

    return () => {
      closed = true;
      if (wsTimer) window.clearTimeout(wsTimer);
      if (ws) ws.close();
      if (sse) sse.close();
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeSection === 'auctions/create-post' && auctionDraft.type !== 'post') {
      dispatch({ type: 'update-auction-draft', payload: { type: 'post' } });
    }

    if (activeSection === 'auctions/create-live' && auctionDraft.type !== 'live') {
      dispatch({ type: 'update-auction-draft', payload: { type: 'live' } });
    }
  }, [activeSection, auctionDraft.type, dispatch]);

  const sectionTitle = useMemo(() => {
    switch (activeSection) {
      case 'auctions/create-post':
        return 'Create Post Auction';
      case 'auctions/create-live':
        return 'Create Live Auction';
      case 'auctions/manage':
        return 'Auction Control Center';
      case 'inventory':
        return 'Inventory';
      case 'analytics':
        return 'Insights';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard Overview';
    }
  }, [activeSection]);

  const headerSubtitle = useMemo(() => {
    switch (activeSection) {
      case 'auctions/create-post':
        return 'Draft a Facebook post auction and capture the essential details.';
      case 'auctions/create-live':
        return 'Plan pacing, increments, and run sheets for your live feed auctions.';
      case 'auctions/manage':
        return 'Keep auctions organised, record bids, and stay on top of follow-ups.';
      case 'inventory':
        return 'Keep product listings up to date and ready to drop.';
      case 'analytics':
        return 'Review performance metrics and bidder engagement.';
      case 'settings':
        return 'Adjust account preferences, payments, and notifications.';
      default:
        return 'Monitor auctions, manage inventory, and keep your commerce pipeline organised.';
    }
  }, [activeSection]);

  const handleWelcomeBegin = () => {
    setHasSeenWelcome(true);
  };

  const handleSchedule = (auction: AuctionDraft) => {
    dispatch({ type: 'add-auction', payload: auction });
  };

  const handleDeleteAuction = (id: string) => {
    dispatch({ type: 'delete-auction', payload: id });
  };

  const handleEditAuction = (auction: AuctionDraft) => {
    const { date: endDate, time: endTime } = splitDateTime(auction.endDateTime);
    dispatch({
      type: 'update-auction-draft',
      payload: {
        ...auction,
        status: 'draft',
        endDate,
        endTime
      }
    });
    setActiveSection(auction.type === 'live' ? 'auctions/create-live' : 'auctions/create-post');
  };

  const handleFetchBids = async (auctionId: string) => {
    const isGraphId = (id: string) => /^\d+(_\d+)?$/.test(id);

    try {
      const auction = previousAuctions.find(a => a.id === auctionId);
      if (!auction) {
        console.error('Cannot fetch bids: unknown auction');
        return;
      }

      // Prefer fetching by URL for private group posts or when the app ID is insufficient
      if (auction.postUrl) {
        const bidData = await fetchBidsByUrl(auction.postUrl);
        dispatch({ type: 'update-auction', payload: { id: auctionId, ...bidData } });
        return;
      }

      if (isGraphId(auctionId)) {
        const bidData = await fetchBids(auctionId);
        dispatch({ type: 'update-auction', payload: { id: auctionId, ...bidData } });
        return;
      }

      console.error('Cannot fetch bids: provide a valid Facebook post URL or Graph post ID for this auction.');
    } catch (err) {
      console.error('Failed to fetch bids:', err);
    }
  };

  if (!profile) {
    if (!hasSeenWelcome) {
      return <WelcomeScreen onBegin={handleWelcomeBegin} />;
    }
    return <OnboardingWizard />;
  }

  const resolveAuctionMode = (): AuctionViewMode => {
    if (activeSection === 'auctions/create-post') {
      return 'create-post';
    }
    if (activeSection === 'auctions/create-live') {
      return 'create-live';
    }
    return 'manage';
  };

  const renderActiveSection = () => {
    if (activeSection === 'overview') {
      return (
        <DashboardOverview
          currency={profile.currency}
          timeZone={profile.timeZone}
          previousAuctions={previousAuctions}
          onEditAuction={handleEditAuction}
          onDeleteAuction={handleDeleteAuction}
          onFetchBids={handleFetchBids}
        />
      );
    }

    if (activeSection.startsWith('auctions')) {
      return (
        <AuctionWorkspace
          mode={resolveAuctionMode()}
          profile={profile}
          draft={auctionDraft}
          previousAuctions={previousAuctions}
          onUpdateDraft={(payload) => dispatch({ type: 'update-auction-draft', payload })}
          onSchedule={handleSchedule}
          onDeleteAuction={handleDeleteAuction}
          onEditAuction={handleEditAuction}
          onNavigate={setActiveSection}
        />
      );
    }

    if (activeSection === 'settings') {
      return <Settings />;
    }

    return (
      <div className="panel-card">
        <div className="empty-state">
          <h3>Coming soon</h3>
          <p>We are still building this area of the control center.</p>
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar displayName={profile.displayName} activeSection={activeSection} onNavigate={setActiveSection} />
      <main className="main-area">
        <header className="main-header">
          <div>
            <h1>{sectionTitle}</h1>
            <p className="header-subtitle">{headerSubtitle}</p>
          </div>
          <div className="session-panel">
            <span className="session-chip">{profile.currency}</span>
            <span className="session-chip">{profile.timeZone}</span>
            <span className="session-chip">Bid interval: {profile.bidMonitoringInterval}m</span>
          </div>
        </header>
        <section className="content-section">{renderActiveSection()}</section>
      </main>
    </div>
  );
}

function App() {
  return (
    <AppStateProvider>
      <AppShell />
    </AppStateProvider>
  );
}

export default App;
