import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const formatCurrency = (currency, value) => {
    if (value === undefined || Number.isNaN(value)) {
        return `${currency} 0.00`;
    }
    return `${currency} ${value.toFixed(2)}`;
};
const DashboardOverview = ({ currency, timeZone, previousAuctions, onEditAuction, onDeleteAuction }) => {
    const activeAuctions = previousAuctions.filter((auction) => auction.status === 'scheduled' || auction.status === 'live');
    const completedAuctions = previousAuctions.filter((auction) => auction.status === 'closed');
    const formatDateTime = (value) => {
        if (!value) {
            return '-';
        }
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '-';
            }
            return new Intl.DateTimeFormat(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone
            }).format(date);
        }
        catch {
            return value;
        }
    };
    return (_jsxs("div", { className: "dashboard-wrapper", children: [_jsxs("div", { className: "summary-grid", children: [_jsxs("div", { className: "summary-card", children: [_jsx("span", { className: "summary-label", children: "Active auctions" }), _jsx("span", { className: "summary-value", children: activeAuctions.length }), _jsx("span", { className: "summary-subtext", children: "Scheduled or currently live" })] }), _jsxs("div", { className: "summary-card", children: [_jsx("span", { className: "summary-label", children: "Completed" }), _jsx("span", { className: "summary-value", children: completedAuctions.length }), _jsx("span", { className: "summary-subtext", children: "Auctions closed this session" })] }), _jsxs("div", { className: "summary-card", children: [_jsx("span", { className: "summary-label", children: "Currency" }), _jsx("span", { className: "summary-value", children: currency }), _jsx("span", { className: "summary-subtext", children: "Configured in onboarding" })] })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Current & recent auctions" }), _jsx("span", { children: "Track live progress and revisit outcomes" })] }), previousAuctions.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No auctions yet" }), _jsx("p", { children: "Create your first post or live auction to see it appear here." })] })) : (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Current bid" }), _jsx("th", { children: "Leading bidder" }), _jsx("th", { children: "Reserve" }), _jsx("th", { children: "Starting" }), _jsx("th", { children: "Ends" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: previousAuctions.map((auction) => (_jsxs("tr", { children: [_jsx("td", { children: auction.id }), _jsx("td", { children: _jsx("span", { className: `status-chip ${auction.status}`, children: auction.status.charAt(0).toUpperCase() + auction.status.slice(1) }) }), _jsx("td", { children: auction.type === 'live' ? 'Live feed' : 'Post' }), _jsx("td", { children: auction.itemName || '-' }), _jsx("td", { children: formatCurrency(currency, auction.currentBid ?? auction.startingPrice) }), _jsx("td", { children: auction.leadingBidder || '-' }), _jsx("td", { children: formatCurrency(currency, auction.reservePrice) }), _jsx("td", { children: formatCurrency(currency, auction.startingPrice) }), _jsx("td", { children: formatDateTime(auction.endDateTime) }), _jsx("td", { children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => onEditAuction(auction), "aria-label": "Edit auction", title: "Edit auction", children: "\u270F\uFE0F" }), _jsx("button", { type: "button", className: "icon-button danger", onClick: () => onDeleteAuction(auction.id), "aria-label": "Delete auction", title: "Delete auction", children: "\uD83D\uDDD1\uFE0F" })] }) })] }, auction.id))) })] }) }))] })] }));
};
export default DashboardOverview;
