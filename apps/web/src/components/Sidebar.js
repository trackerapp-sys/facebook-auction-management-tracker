import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const navItems = [
    { key: 'overview', label: 'Overview', description: 'Key stats & activity', icon: '📊' },
    {
        key: 'auctions',
        label: 'Auctions',
        description: 'Plan, publish, and monitor',
        icon: '🛎️',
        target: 'auctions/manage',
        children: [
            { key: 'auctions/manage', label: 'Manage auctions', description: 'Facebook link & schedule', icon: '📋' },
            { key: 'auctions/create-post', label: 'Create post auction', description: 'Single post drop', icon: '📝' },
            { key: 'auctions/create-live', label: 'Create live auction', description: 'Sequenced live sale', icon: '🎥' }
        ]
    },
    { key: 'inventory', label: 'Inventory', description: 'Catalogue items & stock', icon: '📦' },
    { key: 'analytics', label: 'Insights', description: 'Performance analytics', icon: '📈' },
    { key: 'settings', label: 'Settings', description: 'Brand preferences', icon: '⚙️' }
];
const Sidebar = ({ displayName, activeSection, onNavigate }) => {
    const renderNavButton = (item, isActive) => (_jsxs("button", { type: "button", className: `nav-button ${isActive ? 'active' : ''}`, onClick: () => onNavigate(item.key), children: [_jsx("div", { className: "nav-icon", "aria-hidden": true, children: item.icon }), _jsxs("div", { children: [_jsx("span", { children: item.label }), _jsx("small", { children: item.description })] })] }, item.key));
    return (_jsxs("aside", { className: "sidebar", children: [_jsxs("div", { className: "sidebar-logo", children: [_jsx("span", { className: "logo-mark", children: "FA" }), _jsxs("div", { children: [_jsx("strong", { children: "Facebook Auctions" }), _jsx("p", { children: "Management Studio" })] })] }), _jsxs("div", { className: "welcome-card", children: [_jsx("span", { className: "badge success", children: "Seller profile" }), _jsxs("h2", { children: ["Hello, ", displayName] }), _jsx("p", { children: "Stay on top of live bids, scheduled drops, and bidder follow-ups." })] }), _jsx("nav", { className: "sidebar-nav", children: navItems.map((item) => {
                    if ('children' in item) {
                        const isParentActive = item.children.some((child) => child.key === activeSection);
                        return (_jsxs("div", { className: `nav-group ${isParentActive ? 'expanded' : ''}`, children: [renderNavButton({
                                    key: item.target,
                                    label: item.label,
                                    description: item.description,
                                    icon: item.icon
                                }, isParentActive || item.target === activeSection), _jsx("div", { className: "sub-nav", children: item.children.map((child) => renderNavButton(child, child.key === activeSection)) })] }, item.key));
                    }
                    return renderNavButton(item, item.key === activeSection);
                }) }), _jsxs("div", { className: "sidebar-footer", children: [_jsx("p", { className: "footer-title", children: "Need to run multiple auctions?" }), _jsx("p", { className: "footer-copy", children: "Upgrade to unlock AI-assisted bid moderation and advanced analytics." }), _jsx("button", { type: "button", className: "upgrade-button", children: "Explore Pro" })] })] }));
};
export default Sidebar;
