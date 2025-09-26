import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { AppStateProvider, useAppState } from './state';
import OnboardingWizard from './components/OnboardingWizard';
import AuctionWorkspace from './components/AuctionWorkspace';
import Sidebar from './components/Sidebar';
import LoginScreen from './components/LoginScreen';
import DashboardOverview from './components/DashboardOverview';
import WelcomeScreen from './components/WelcomeScreen';
import { checkFacebookSession, fetchUserGroups } from './services';
import './App.css';
const WELCOME_ACK_KEY = 'facebook-auction-welcome-ack';
function AppShell() {
    const { state: { profile, facebookAuth, auctionDraft, groups, previousAuctions }, dispatch } = useAppState();
    const [activeSection, setActiveSection] = useState('overview');
    const [isBootstrapping, setIsBootstrapping] = useState(true);
    const [startupError, setStartupError] = useState(null);
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
                    }
                    catch (groupError) {
                        if (!cancelled) {
                            console.warn('Unable to load Facebook groups during bootstrap', groupError);
                            setStartupError('Connected to Facebook, but failed to load your groups. Try reconnecting.');
                        }
                    }
                }
                else {
                    dispatch({ type: 'set-facebook-groups', payload: [] });
                }
            }
            catch (error) {
                if (!cancelled) {
                    console.warn('Failed to verify Facebook session', error);
                    dispatch({ type: 'set-facebook-auth', payload: { isAuthenticated: false } });
                    dispatch({ type: 'set-facebook-groups', payload: [] });
                    setStartupError('Unable to verify Facebook session. Please login again.');
                }
            }
            finally {
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
    const handleAuthenticated = (authState, fetchedGroups) => {
        dispatch({ type: 'set-facebook-auth', payload: authState });
        dispatch({ type: 'set-facebook-groups', payload: fetchedGroups });
        setStartupError(null);
    };
    if (isBootstrapping) {
        return (_jsx("div", { className: "auth-gate booting", children: _jsxs("div", { className: "auth-panel loading", children: [_jsx("div", { className: "auth-logo", children: "FM" }), _jsx("p", { children: "Preparing your workspace..." })] }) }));
    }
    if (!facebookAuth.isAuthenticated) {
        return _jsx(LoginScreen, { error: startupError, onAuthenticated: handleAuthenticated });
    }
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
    const renderActiveSection = () => {
        if (activeSection === 'overview') {
            return _jsx(DashboardOverview, { currency: profile.currency, previousAuctions: previousAuctions });
        }
        if (activeSection.startsWith('auctions')) {
            return (_jsx(AuctionWorkspace, { mode: resolveAuctionMode(), profile: profile, facebookAuth: facebookAuth, groups: groups, draft: auctionDraft, previousAuctions: previousAuctions, onUpdateDraft: (payload) => dispatch({ type: 'update-auction-draft', payload }), onAuth: (payload) => dispatch({ type: 'set-facebook-auth', payload }), onGroups: (payload) => dispatch({ type: 'set-facebook-groups', payload }), onSchedule: (auction) => dispatch({ type: 'add-auction', payload: auction }) }));
        }
        return (_jsx("div", { className: "panel-card", children: _jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "Coming soon" }), _jsx("p", { children: "We are still building this area of the control center." })] }) }));
    };
    return (_jsxs("div", { className: "app-layout", children: [_jsx(Sidebar, { displayName: profile.displayName, activeSection: activeSection, onNavigate: setActiveSection }), _jsxs("main", { className: "main-area", children: [_jsxs("header", { className: "main-header", children: [_jsxs("div", { children: [_jsx("h1", { children: sectionTitle }), _jsx("p", { className: "header-subtitle", children: headerSubtitle })] }), _jsxs("div", { className: "session-panel", children: [_jsx("span", { className: "session-chip", children: profile.currency }), _jsx("span", { className: "session-chip", children: profile.timeZone }), _jsxs("span", { className: "session-chip", children: ["Bid interval: ", profile.bidMonitoringInterval, "m"] })] })] }), _jsx("section", { className: "content-section", children: renderActiveSection() })] })] }));
}
function App() {
    return (_jsx(AppStateProvider, { children: _jsx(AppShell, {}) }));
}
export default App;
