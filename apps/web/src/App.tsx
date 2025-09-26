import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import type { FacebookAuthState, FacebookGroup } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace, { type AuctionViewMode } from './components/AuctionWorkspace';
import Sidebar, { type SectionKey } from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './components/DashboardOverview';
import WelcomeScreen from './components/WelcomeScreen';
import { checkFacebookSession, fetchUserGroups } from './services';
import './App.css';

const WELCOME_ACK_KEY = 'facebook-auction-welcome-ack';

function AppShell() {
  const {
    state: { profile, facebookAuth, auctionDraft, groups, previousAuctions },
    dispatch
  } = useAppState();
  const [activeSection, setActiveSection] = useState<SectionKey>('overview');
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);
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
    let cancelled = false;

    const bootstrapSession = async () => {
      try {
        const session = await checkFacebookSession();
        if (cancelled) {
          return;
        }

        dispatch({ type: 'set-facebook-auth', payload: session });

        if (session.isAuthenticated) {
          try {
            const fetchedGroups = await fetchUserGroups();
            if (!cancelled) {
              dispatch({ type: 'set-facebook-groups', payload: fetchedGroups });
            }
          } catch (groupError) {
            if (!cancelled) {
              console.warn('Unable to load Facebook groups during bootstrap', groupError);
              setStartupError('Connected to Facebook, but failed to load your groups. Try reconnecting.');
            }
          }
        } else {
          dispatch({ type: 'set-facebook-groups', payload: [] });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn('Failed to verify Facebook session', error);
          dispatch({ type: 'set-facebook-auth', payload: { isAuthenticated: false } });
          dispatch({ type: 'set-facebook-groups', payload: [] });
          setStartupError('Unable to verify Facebook session. Please login again.');
        }
      } finally {
        if (!cancelled) {
          setIsBootstrapping(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      cancelled = true;
    };
  }, [dispatch]);

  useEffect(() => {
    if (activeSection === 'auctions/create-post' && auctionDraft.type !== 'post') {
      dispatch({ type: 'update-auction-draft', payload: { type: 'post', intervalBetweenItems: undefined } });
    }

    if (activeSection === 'auctions/create-live' && auctionDraft.type !== 'live') {
      dispatch({
        type: 'update-auction-draft',
        payload: { type: 'live', intervalBetweenItems: auctionDraft.intervalBetweenItems ?? 4 }
      });
    }
  }, [activeSection, auctionDraft.type, auctionDraft.intervalBetweenItems, dispatch]);

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
        return 'Craft a single post auction ready to publish to your chosen group.';
      case 'auctions/create-live':
        return 'Set up a sequenced live auction with pacing and bid controls.';
      case 'auctions/manage':
        return 'Monitor Facebook connection, schedule auctions, and track progress.';
      case 'inventory':
        return 'Keep product listings up to date and ready to drop.';
      case 'analytics':
        return 'Review performance metrics and bidder engagement.';
      case 'settings':
        return 'Adjust account preferences, payments, and notifications.';
      default:
        return 'Monitor auctions, manage inventory, and keep your Facebook commerce pipeline organised.';
    }
  }, [activeSection]);

  const handleWelcomeBegin = () => {
    setHasSeenWelcome(true);
  };

  const handleAuthenticated = (authState: FacebookAuthState, fetchedGroups: FacebookGroup[]) => {
    dispatch({ type: 'set-facebook-auth', payload: authState });
    dispatch({ type: 'set-facebook-groups', payload: fetchedGroups });
    setStartupError(null);
  };

  if (isBootstrapping) {
    return (
      <div className="auth-gate booting">
        <div className="auth-panel loading">
          <div className="auth-logo">FM</div>
          <p>Preparing your workspace...</p>
        </div>
      </div>
    );
  }

  if (!facebookAuth.isAuthenticated) {
    return <LoginScreen error={startupError} onAuthenticated={handleAuthenticated} />;
  }

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
      return <DashboardOverview currency={profile.currency} previousAuctions={previousAuctions} />;
    }

    if (activeSection.startsWith('auctions')) {
      return (
        <AuctionWorkspace
          mode={resolveAuctionMode()}
          profile={profile}
          facebookAuth={facebookAuth}
          groups={groups}
          draft={auctionDraft}
          previousAuctions={previousAuctions}
          onUpdateDraft={(payload) => dispatch({ type: 'update-auction-draft', payload })}
          onAuth={(payload) => dispatch({ type: 'set-facebook-auth', payload })}
          onGroups={(payload) => dispatch({ type: 'set-facebook-groups', payload })}
          onSchedule={(auction) => dispatch({ type: 'add-auction', payload: auction })}
        />
      );
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
