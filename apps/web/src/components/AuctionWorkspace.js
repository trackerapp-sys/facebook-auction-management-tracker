import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { scheduleAuction } from '../api';
const CARAT_TO_GRAM = 0.2;
const combineDateTime = (date, time) => {
    if (!date || !time) {
        return undefined;
    }
    return `${date}T${time}`;
};
const splitDateTime = (value) => {
    if (!value) {
        return {};
    }
    return {
        date: value.slice(0, 10),
        time: value.slice(11, 16)
    };
};
const AuctionWorkspace = ({ mode, profile, draft, previousAuctions, onUpdateDraft, onSchedule, onDeleteAuction, onEditAuction, onNavigate }) => {
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleMessage, setScheduleMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const isCreationMode = mode !== 'manage';
    const isPostMode = mode === 'create-post';
    const endDateValue = draft.endDate ?? splitDateTime(draft.endDateTime).date ?? '';
    const endTimeValue = draft.endTime ?? splitDateTime(draft.endDateTime).time ?? '';
    const dateFormatter = useMemo(() => new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: profile.timeZone
    }), [profile.timeZone]);
    const formatDateTime = (value) => {
        if (!value) {
            return '-';
        }
        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '-';
            }
            return dateFormatter.format(date);
        }
        catch {
            return value;
        }
    };
    const handleEndDateChange = (value) => {
        onUpdateDraft({
            endDate: value || undefined,
            endDateTime: combineDateTime(value || undefined, endTimeValue || undefined)
        });
    };
    const handleEndTimeChange = (value) => {
        onUpdateDraft({
            endTime: value || undefined,
            endDateTime: combineDateTime(endDateValue || undefined, value || undefined)
        });
    };
    const handleCaratChange = (raw) => {
        if (!raw.trim()) {
            onUpdateDraft({ caratWeight: undefined, gramWeight: undefined });
            return;
        }
        const carats = Number(raw);
        if (Number.isNaN(carats)) {
            return;
        }
        const grams = Number((carats * CARAT_TO_GRAM).toFixed(3));
        onUpdateDraft({ caratWeight: carats, gramWeight: grams });
    };
    const handleGramChange = (raw) => {
        if (!raw.trim()) {
            onUpdateDraft({ gramWeight: undefined, caratWeight: undefined });
            return;
        }
        const grams = Number(raw);
        if (Number.isNaN(grams)) {
            return;
        }
        const carats = Number((grams / CARAT_TO_GRAM).toFixed(3));
        onUpdateDraft({ gramWeight: grams, caratWeight: carats });
    };
    const disableSchedule = isScheduling ||
        !draft.itemName.trim() ||
        (isPostMode && !draft.postUrl?.trim()) ||
        (isPostMode && !combineDateTime(endDateValue || undefined, endTimeValue || undefined));
    const handleSchedule = async () => {
        setIsScheduling(true);
        setScheduleMessage(null);
        setErrorMessage(null);
        try {
            const response = await scheduleAuction(draft);
            const resolvedEnd = response.endDateTime ?? draft.endDateTime ?? combineDateTime(endDateValue || undefined, endTimeValue || undefined);
            const { date: endDate, time: endTime } = splitDateTime(resolvedEnd);
            const scheduledAuction = {
                ...draft,
                id: response.auctionId,
                status: 'scheduled',
                currentBid: response.currentBid ?? draft.currentBid ?? 0,
                leadingBidder: response.leadingBidder ?? draft.leadingBidder,
                startDateTime: response.startDateTime,
                endDateTime: resolvedEnd,
                endDate,
                endTime,
                durationMinutes: response.durationMinutes ?? draft.durationMinutes,
                caratWeight: response.caratWeight ?? draft.caratWeight,
                gramWeight: response.gramWeight ?? draft.gramWeight,
                postUrl: response.postUrl ?? draft.postUrl,
                intervalBetweenItems: response.intervalBetweenItems ?? draft.intervalBetweenItems,
                autoCloseMinutes: response.autoCloseMinutes ?? draft.autoCloseMinutes
            };
            onSchedule(scheduledAuction);
            setScheduleMessage(response.message || 'Auction details saved locally.');
            onNavigate('overview');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unable to save the auction.';
            setErrorMessage(message);
        }
        finally {
            setIsScheduling(false);
        }
    };
    const renderPreviousAuctions = () => {
        if (previousAuctions.length === 0) {
            return (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No auctions yet" }), _jsx("p", { children: "Create your first auction to track bids and bidder activity." })] }));
        }
        return (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Current bid" }), _jsx("th", { children: "Bidder" }), _jsx("th", { children: "Ends" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: previousAuctions.map((auction) => (_jsxs("tr", { children: [_jsx("td", { children: auction.id }), _jsx("td", { children: _jsx("span", { className: `status-chip ${auction.status}`, children: auction.status.charAt(0).toUpperCase() + auction.status.slice(1) }) }), _jsx("td", { children: auction.type === 'live' ? 'Live feed' : 'Post' }), _jsx("td", { children: auction.itemName || '-' }), _jsxs("td", { children: [profile.currency, " ", (auction.currentBid ?? 0).toFixed(2)] }), _jsx("td", { children: auction.leadingBidder || '-' }), _jsx("td", { children: formatDateTime(auction.endDateTime) }), _jsx("td", { children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => onEditAuction(auction), "aria-label": "Edit auction", title: "Edit auction", children: "\u270F\uFE0F" }), _jsx("button", { type: "button", className: "icon-button danger", onClick: () => onDeleteAuction(auction.id), "aria-label": "Delete auction", title: "Delete auction", children: "\uD83D\uDDD1\uFE0F" })] }) })] }, auction.id))) })] }) }));
    };
    if (!isCreationMode) {
        return _jsx("section", { className: "panel-card", children: renderPreviousAuctions() });
    }
    return (_jsxs("div", { className: "workspace-columns", children: [_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: mode === 'create-live' ? 'Live auction setup' : 'Post auction setup' }), _jsx("span", { children: "Capture the essentials and save this drop to the tracker" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemNameDraft", children: "Auction title" }), _jsx("input", { id: "itemNameDraft", value: draft.itemName, onChange: (event) => onUpdateDraft({ itemName: event.target.value }), placeholder: "e.g. Sapphire Cocktail Ring" })] }), isPostMode && (_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "postUrl", children: "Facebook post URL" }), _jsx("input", { id: "postUrl", type: "url", placeholder: "https://www.facebook.com/groups/.../posts/...", value: draft.postUrl ?? '', onChange: (event) => onUpdateDraft({ postUrl: event.target.value }) }), _jsx("p", { className: "helper-text", children: "Needed so the tracker can monitor bids for this post." })] }))] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "description", children: "Description" }), _jsx("textarea", { id: "description", rows: 3, value: draft.description, onChange: (event) => onUpdateDraft({ description: event.target.value }), placeholder: "Share item specifics, shipping info, payment terms, and auction rules." })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "reserve", children: ["Reserve price (", profile.currency, ")"] }), _jsx("input", { id: "reserve", type: "number", min: 0, value: draft.reservePrice, onChange: (event) => onUpdateDraft({ reservePrice: Number(event.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "startingPrice", children: ["Starting price (", profile.currency, ")"] }), _jsx("input", { id: "startingPrice", type: "number", min: 0, value: draft.startingPrice, onChange: (event) => onUpdateDraft({ startingPrice: Number(event.target.value) }) })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "bidIncrement", children: ["Bid increment (", profile.currency, ")"] }), _jsx("input", { id: "bidIncrement", type: "number", min: 1, value: draft.bidIncrement, onChange: (event) => onUpdateDraft({ bidIncrement: Number(event.target.value) }) })] }), isPostMode && (_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "endDate", children: "End date" }), _jsx("input", { id: "endDate", type: "date", value: endDateValue, onChange: (event) => handleEndDateChange(event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "endTime", children: "End time" }), _jsx("input", { id: "endTime", type: "time", value: endTimeValue, onChange: (event) => handleEndTimeChange(event.target.value) })] })] }))] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "caratWeight", children: "Carat weight" }), _jsx("input", { id: "caratWeight", type: "number", min: 0, value: draft.caratWeight ?? '', onChange: (event) => handleCaratChange(event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "gramWeight", children: "Gram weight" }), _jsx("input", { id: "gramWeight", type: "number", min: 0, value: draft.gramWeight ?? '', onChange: (event) => handleGramChange(event.target.value) })] })] })] }), _jsxs("div", { className: "panel-footer", children: [_jsxs("div", { className: "form-grid", children: [_jsx("p", { className: `helper-text ${disableSchedule ? 'danger' : ''}`,
                                                children: disableSchedule
                                                ? 'Provide the required information above to enable saving.'
                                                : 'All set. Save the auction and keep bidding updates in one place.' }) }), _jsx("button", { type: "button", className: "primary-action", onClick: handleSchedule, disabled: disableSchedule, children: isScheduling ? 'Saving...' : 'Save auction' })] }), scheduleMessage && _jsx("div", { className: "success-banner", children: scheduleMessage }), errorMessage && _jsx("div", { className: "error-banner", children: errorMessage })] })] }), _jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Saved auctions" }), _jsx("span", { children: "Quick view of current and past drops" })] }), renderPreviousAuctions()] })] }));
};
export default AuctionWorkspace;