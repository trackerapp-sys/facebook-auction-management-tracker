import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const LoginScreen = ({ message, error }) => {
    return (_jsx("div", { className: "auth-gate", children: _jsxs("div", { className: "auth-panel", children: [_jsx("div", { className: "auth-logo", children: "AT" }), _jsx("h1", { children: "Auction Tracker" }), _jsx("p", { className: "helper-text", children: message ?? 'Your workspace is ready. Use the onboarding wizard to configure your business details.' }), error && _jsx("div", { className: "error-banner", children: error })] }) }));
};
export default LoginScreen;
