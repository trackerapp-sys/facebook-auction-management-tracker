import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const WelcomeScreen = ({ onBegin }) => {
    return (_jsx("div", { className: "welcome-gate", children: _jsxs("div", { className: "welcome-panel", children: [_jsxs("div", { className: "welcome-header", children: [_jsx("span", { className: "logo-mark", children: "FA" }), _jsx("h1", { children: "Welcome to Facebook Auction Tracker" })] }), _jsx("p", { children: "We will guide you through a quick setup so the workspace can tailor alerts, currency, and time zone to your business. Connect Facebook when prompted and we will take care of the heavy lifting." }), _jsx("button", { type: "button", className: "primary-action", onClick: onBegin, children: "Enter setup" }), _jsx("p", { className: "helper-text", children: "You can revisit onboarding any time from Settings." })] }) }));
};
export default WelcomeScreen;
