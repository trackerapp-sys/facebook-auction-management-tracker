import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const sections = [
    { key: 'overview', label: 'Overview', description: 'Key stats & updates', icon: '📊' },
    { key: 'auctions', label: 'Auctions', description: 'Manage live + post auctions', icon: '⚡' },
    { key: 'inventory', label: 'Inventory', description: 'Catalogue items & stock', icon: '📦' },
    { key: 'analytics', label: 'Insights', description: 'Performance analytics', icon: '📈' },
    { key: 'settings', label: 'Settings', description: 'Brand preferences', icon: '⚙️' }
];
const Sidebar = ({ displayName, activeSection, onNavigate }) => {
    return (_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-logo", children: [_jsx("span", { className: "logo-mark", children: "FA" }), _jsxs("div", { children: [_jsx("strong", { children: "Facebook Auctions" }), _jsx("p", { children: "Management Studio" })] })] }), _jsxs("div", { className: "welcome-card", children: [_jsx("span", { className: "badge success", children: "Seller profile" }), _jsxs("h2", { children: ["Hello, ", displayName] }), _jsx("p", { children: "Stay on top of live bids, scheduled drops, and bidder follow-ups." })] }), _jsx("nav", { className: "sidebar-nav", children: sections.map(({ key, label, description, icon }) => {
                    const isActive = key === activeSection;
                    return (_jsxs("button", { type: "button", className: `nav-button ${isActive ? 'active' : ''}`, onClick: () => onNavigate(key), children: [_jsx("div", { className: "nav-icon", "aria-hidden": true, children: icon }), _jsxs("div", { children: [_jsx("span", { children: label }), _jsx("small", { children: description })] })] }, key));
                }) }), _jsxs("div", { className: "sidebar-footer", children: [_jsx("p", { className: "footer-title", children: "Need to run multiple auctions?" }), _jsx("p", { className: "footer-copy", children: "Upgrade to unlock AI-assisted bid moderation and advanced analytics." }), _jsx("button", { type: "button", className: "upgrade-button", children: "Explore Pro" })] })] }));
};
export default Sidebar;
