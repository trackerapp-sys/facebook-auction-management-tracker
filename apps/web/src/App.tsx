import { useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace from './components/AuctionWorkspace';
import Sidebar from './components/Sidebar';
import './App.css';

function AppShell() {
  const {
    state: { profile, facebookAuth, auctionDraft, groups, previousAuctions },
    dispatch
  } = useAppState();
  const [activeSection, setActiveSection] = useState<'overview' | 'auctions' | 'inventory' | 'settings' | 'analytics'>(
    'overview'
  );

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
