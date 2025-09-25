import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import type { FacebookAuthState, FacebookGroup } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace from './components/AuctionWorkspace';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import { checkFacebookSession, fetchUserGroups } from './services';
import './App.css';

function AppShell() {
  const {
    state: { profile, facebookAuth, auctionDraft, groups, previousAuctions },
    dispatch
  } = useAppState();
  const [activeSection, setActiveSection] = useState<'overview' | 'auctions' | 'inventory' | 'settings' | 'analytics'>(
    'overview'
  );
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [startupError, setStartupError] = useState<string | null>(null);

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

  const sectionTitle = useMemo(() => {
    switch (activeSection) {
      case 'inventory':
        return 'Inventory';
      case 'settings':
        return 'Settings';
      case 'analytics':
        return 'Insights';
      case 'auctions':
        return 'Auction Control Center';
      default:
        return 'Dashboard Overview';
    }
  }, [activeSection]);

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
    return <OnboardingWizard />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        displayName={profile.displayName}
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />
      <main className="main-area">
        <header className="main-header">
          <div>
            <h1>{sectionTitle}</h1>
            <p className="header-subtitle">
              Monitor auctions, manage inventory, and keep your Facebook commerce pipeline organised.
            </p>
          </div>
          <div className="session-panel">
            <span className="session-chip">{profile.currency}</span>
            <span className="session-chip">{profile.timeZone}</span>
            <span className="session-chip">Bid interval: {profile.bidMonitoringInterval}m</span>
          </div>
        </header>
        <section className="content-section">
          <AuctionWorkspace
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
        </section>
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
