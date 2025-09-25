import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace from './components/AuctionWorkspace';
import Sidebar from './components/Sidebar';
import './App.css';
function AppShell() {
    const { state: { profile, facebookAuth, auctionDraft, groups, previousAuctions }, dispatch } = useAppState();
    const [activeSection, setActiveSection] = useState('overview');
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
        return _jsx(OnboardingWizard, {});
    }
    return (_jsxs("div", { className: "app-layout", children: [_jsx(Sidebar, { displayName: profile.displayName, activeSection: activeSection, onNavigate: setActiveSection }), _jsxs("main", { className: "main-area", children: [_jsxs("header", { className: "main-header", children: [_jsxs("div", { children: [_jsx("h1", { children: sectionTitle }), _jsx("p", { className: "header-subtitle", children: "Monitor auctions, manage inventory, and keep your Facebook commerce pipeline organised." })] }), _jsxs("div", { className: "session-panel", children: [_jsx("span", { className: "session-chip", children: profile.currency }), _jsx("span", { className: "session-chip", children: profile.timeZone }), _jsxs("span", { className: "session-chip", children: ["Bid interval: ", profile.bidMonitoringInterval, "m"] })] })] }), _jsx("section", { className: "content-section", children: _jsx(AuctionWorkspace, { profile: profile, facebookAuth: facebookAuth, groups: groups, draft: auctionDraft, previousAuctions: previousAuctions, onUpdateDraft: (payload) => dispatch({ type: 'update-auction-draft', payload }), onAuth: (payload) => dispatch({ type: 'set-facebook-auth', payload }), onGroups: (payload) => dispatch({ type: 'set-facebook-groups', payload }), onSchedule: (auction) => dispatch({ type: 'add-auction', payload: auction }) }) })] })] }));
}
function App() {
    return (_jsx(AppStateProvider, { children: _jsx(AppShell, {}) }));
}
export default App;
