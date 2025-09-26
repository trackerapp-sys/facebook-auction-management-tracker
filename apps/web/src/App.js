import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace from './components/AuctionWorkspace';
import Sidebar from './components/Sidebar';
import DashboardOverview from './components/DashboardOverview';
import WelcomeScreen from './components/WelcomeScreen';
import './App.css';
const WELCOME_ACK_KEY = 'facebook-auction-welcome-ack';
function AppShell() {
    const { state: { profile, auctionDraft, previousAuctions }, dispatch } = useAppState();
    const [activeSection, setActiveSection] = useState('overview');
    const [hasSeenWelcome, setHasSeenWelcome] = useState(() => {
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
            return _jsx(WelcomeScreen, { onBegin: handleWelcomeBegin });
        }
        return _jsx(OnboardingWizard, {});
    }
    const resolveAuctionMode = () => {
        if (activeSection === 'auctions/create-post') {
            return 'create-post';
        }
        if (activeSection === 'auctions/create-live') {
            return 'create-live';
        }
        return 'manage';
    };
    const handleSchedule = (auction) => {
        dispatch({ type: 'add-auction', payload: auction });
    };
    const handleDeleteAuction = (id) => {
        dispatch({ type: 'delete-auction', payload: id });
    };
    const handleEditAuction = (auction) => {
        dispatch({ type: 'update-auction-draft', payload: { ...auction, status: 'draft' } });
        setActiveSection(auction.type === 'live' ? 'auctions/create-live' : 'auctions/create-post');
    };
    const renderActiveSection = () => {
        if (activeSection === 'overview') {
            return (_jsx(DashboardOverview, { currency: profile.currency, previousAuctions: previousAuctions, onEditAuction: handleEditAuction, onDeleteAuction: handleDeleteAuction }));
        }
        if (activeSection.startsWith('auctions')) {
            return (_jsx(AuctionWorkspace, { mode: resolveAuctionMode(), profile: profile, draft: auctionDraft, previousAuctions: previousAuctions, onUpdateDraft: (payload) => dispatch({ type: 'update-auction-draft', payload }), onSchedule: handleSchedule, onDeleteAuction: handleDeleteAuction, onEditAuction: handleEditAuction, onNavigate: setActiveSection }));
        }
        return (_jsx("div", { className: "panel-card", children: _jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "Coming soon" }), _jsx("p", { children: "We are still building this area of the control center." })] }) }));
    };
    return (_jsxs("div", { className: "app-layout", children: [_jsx(Sidebar, { displayName: profile.displayName, activeSection: activeSection, onNavigate: setActiveSection }), _jsxs("main", { className: "main-area", children: [_jsxs("header", { className: "main-header", children: [_jsxs("div", { children: [_jsx("h1", { children: sectionTitle }), _jsx("p", { className: "header-subtitle", children: headerSubtitle })] }), _jsxs("div", { className: "session-panel", children: [_jsx("span", { className: "session-chip", children: profile.currency }), _jsx("span", { className: "session-chip", children: profile.timeZone }), _jsxs("span", { className: "session-chip", children: ["Bid interval: ", profile.bidMonitoringInterval, "m"] })] })] }), _jsx("section", { className: "content-section", children: renderActiveSection() })] })] }));
}
function App() {
    return (_jsx(AppStateProvider, { children: _jsx(AppShell, {}) }));
}
export default App;
