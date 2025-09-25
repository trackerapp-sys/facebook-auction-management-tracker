import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { fetchUserGroups, loginWithFacebook } from '../services';
const LoginScreen = ({ onAuthenticated, error }) => {
    const [isLoggingIn, setIsLoggingIn] = useState(false);
    const [loginError, setLoginError] = useState(null);
    const handleLogin = async () => {
        setIsLoggingIn(true);
        setLoginError(null);
        try {
            const authState = await loginWithFacebook();
            if (!authState.isAuthenticated) {
                throw new Error('Facebook login did not complete. Please try again.');
            }
            const groups = await fetchUserGroups();
            onAuthenticated(authState, groups);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to login with Facebook.';
            setLoginError(message);
        }
        finally {
            setIsLoggingIn(false);
        }
    };
    return (_jsx("div", { className: "auth-gate", children: _jsxs("div", { className: "auth-panel", children: [_jsx("div", { className: "auth-logo", children: "FM" }), _jsx("h1", { children: "Connect your Facebook account" }), _jsx("p", { className: "helper-text", children: "Link Facebook to sync your groups, monitor bids, and manage auctions in one place." }), error && _jsx("div", { className: "error-banner", children: error }), loginError && _jsx("div", { className: "error-banner", children: loginError }), _jsxs("button", { type: "button", className: "facebook-button", onClick: handleLogin, disabled: isLoggingIn, children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", role: "img", "aria-hidden": true, children: _jsx("path", { d: "M13.5 22V12.75H16.5L17 9H13.5V7C13.5 5.97 13.75 5.25 15.23 5.25H17V2.14C16.12 2.04 15.23 2 14.35 2C11.64 2 9.75 3.66 9.75 6.7V9H7V12.75H9.75V22H13.5Z" }) }), isLoggingIn ? 'Connecting...' : 'Login with Facebook'] }), _jsx("p", { className: "auth-disclaimer", children: "We never post without your permission. You can revoke access anytime from Facebook settings." })] }) }));
};
export default LoginScreen;
