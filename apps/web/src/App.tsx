import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import type { AuctionDraft } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace, { type AuctionViewMode } from './components/AuctionWorkspace';
import Sidebar, { type SectionKey } from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import WelcomeScreen from './components/WelcomeScreen';
import './App.css';

const WELCOME_ACK_KEY = 'facebook-auction-welcome-ack';

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

  const handleSchedule = (auction: AuctionDraft) => {
    dispatch({ type: 'add-auction', payload: auction });
  };

  const handleDeleteAuction = (id: string) => {
    dispatch({ type: 'delete-auction', payload: id });
  };

  const handleEditAuction = (auction: AuctionDraft) => {
    dispatch({ type: 'update-auction-draft', payload: { ...auction, status: 'draft' } });
    setActiveSection(auction.type === 'live' ? 'auctions/create-live' : 'auctions/create-post');
  };

  const renderActiveSection = () => {
    if (activeSection === 'overview') {
      return (
        <DashboardOverview
          currency={profile.currency}
          previousAuctions={previousAuctions}
          onEditAuction={handleEditAuction}
          onDeleteAuction={handleDeleteAuction}
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
