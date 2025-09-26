import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { scheduleAuction } from '../services';
const CARAT_TO_GRAM = 0.2;
const formatDate = (value) => value.toISOString().slice(0, 10);
const formatTime = (value) => value.toISOString().slice(11, 16);
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
    const date = value.slice(0, 10);
    const time = value.slice(11, 16);
    return { date, time };
};
const diffInMinutes = (startISO, endISO) => {
    if (!startISO || !endISO) {
        return undefined;
    }
    const start = new Date(startISO).getTime();
    const end = new Date(endISO).getTime();
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return undefined;
    }
    return Math.round((end - start) / 60000);
};
const AuctionWorkspace = ({ mode, profile, draft, previousAuctions, onUpdateDraft, onSchedule, onDeleteAuction, onEditAuction, onNavigate }) => {
    const [isScheduling, setIsScheduling] = useState(false);
    const [scheduleMessage, setScheduleMessage] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const isCreationMode = mode !== 'manage';
    const creationHeading = useMemo(() => {
        if (mode === 'create-live') {
            return 'Live auction setup';
        }
        if (mode === 'create-post') {
            return 'Post auction setup';
        }
        return 'Auction designer';
    }, [mode]);
    useEffect(() => {
        if (!isCreationMode) {
            return;
        }
        const now = new Date();
        const updates = {};
        if (!draft.startDate) {
            updates.startDate = formatDate(now);
        }
        if (!draft.startTime) {
            updates.startTime = formatTime(now);
        }
        if (!draft.durationMinutes) {
            updates.durationMinutes = 60;
        }
        if (draft.currentBid === undefined) {
            updates.currentBid = draft.startingPrice || 0;
        }
        if (!draft.leadingBidder) {
            updates.leadingBidder = '';
        }
        if (Object.keys(updates).length > 0) {
            onUpdateDraft(updates);
        }
    }, [isCreationMode, draft.startDate, draft.startTime, draft.durationMinutes, draft.currentBid, draft.leadingBidder, draft.startingPrice, onUpdateDraft]);
    useEffect(() => {
        if (!isCreationMode) {
            return;
        }
        const startISO = combineDateTime(draft.startDate, draft.startTime);
        if (startISO) {
            const duration = draft.durationMinutes ?? 60;
            const startDate = new Date(startISO);
            if (!Number.isNaN(startDate.getTime())) {
                const endDate = new Date(startDate.getTime() + duration * 60000);
                onUpdateDraft({
                    startDateTime: startISO,
                    endDateTime: endDate.toISOString(),
                    endDate: formatDate(endDate),
                    endTime: formatTime(endDate)
                });
            }
        }
    }, [isCreationMode, draft.startDate, draft.startTime, draft.durationMinutes, onUpdateDraft]);
    const handleCaratChange = (raw) => {
        if (raw.trim() === '') {
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
        if (raw.trim() === '') {
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
    const handleDurationChange = (raw) => {
        const value = Number(raw);
        if (Number.isNaN(value) || value <= 0) {
            onUpdateDraft({ durationMinutes: undefined });
            return;
        }
        const startISO = combineDateTime(draft.startDate, draft.startTime);
        if (!startISO) {
            onUpdateDraft({ durationMinutes: value });
            return;
        }
        const startDate = new Date(startISO);
        if (Number.isNaN(startDate.getTime())) {
            onUpdateDraft({ durationMinutes: value });
            return;
        }
        const endDate = new Date(startDate.getTime() + value * 60000);
        onUpdateDraft({
            durationMinutes: value,
            endDate: formatDate(endDate),
            endTime: formatTime(endDate),
            endDateTime: endDate.toISOString()
        });
    };
    const handleStartDateChange = (value) => {
        const updates = {
            startDate: value || undefined
        };
        const startISO = combineDateTime(value || undefined, draft.startTime);
        if (startISO) {
            const duration = draft.durationMinutes ?? 60;
            const startDate = new Date(startISO);
            if (!Number.isNaN(startDate.getTime())) {
                const endDate = new Date(startDate.getTime() + duration * 60000);
                updates.startDateTime = startISO;
                updates.endDate = formatDate(endDate);
                updates.endTime = formatTime(endDate);
                updates.endDateTime = endDate.toISOString();
            }
        }
        onUpdateDraft(updates);
    };
    const handleStartTimeChange = (value) => {
        const updates = {
            startTime: value || undefined
        };
        const startISO = combineDateTime(draft.startDate, value || undefined);
        if (startISO) {
            const duration = draft.durationMinutes ?? 60;
            const startDate = new Date(startISO);
            if (!Number.isNaN(startDate.getTime())) {
                const endDate = new Date(startDate.getTime() + duration * 60000);
                updates.startDateTime = startISO;
                updates.endDate = formatDate(endDate);
                updates.endTime = formatTime(endDate);
                updates.endDateTime = endDate.toISOString();
            }
        }
        onUpdateDraft(updates);
    };
    const handleEndDateChange = (value) => {
        const endISO = combineDateTime(value || undefined, draft.endTime);
        const updates = {
            endDate: value || undefined,
            endDateTime: endISO
        };
        const startISO = combineDateTime(draft.startDate, draft.startTime);
        const newDuration = diffInMinutes(startISO, endISO);
        if (newDuration !== undefined) {
            updates.durationMinutes = newDuration;
        }
        onUpdateDraft(updates);
    };
    const handleEndTimeChange = (value) => {
        const endISO = combineDateTime(draft.endDate, value || undefined);
        const updates = {
            endTime: value || undefined,
            endDateTime: endISO
        };
        const startISO = combineDateTime(draft.startDate, draft.startTime);
        const newDuration = diffInMinutes(startISO, endISO);
        if (newDuration !== undefined) {
            updates.durationMinutes = newDuration;
        }
        onUpdateDraft(updates);
    };
    const disableSchedule = !isCreationMode ||
        isScheduling ||
        !draft.itemName.trim() ||
        !draft.groupName?.trim() ||
        !draft.groupUrl?.trim();
    const handleSchedule = async () => {
        setIsScheduling(true);
        setScheduleMessage(null);
        setErrorMessage(null);
        try {
            const response = await scheduleAuction(draft);
            const scheduledAuction = {
                ...draft,
                id: response.auctionId,
                status: 'scheduled',
                currentBid: response.currentBid ?? draft.currentBid ?? draft.startingPrice,
                leadingBidder: response.leadingBidder ?? draft.leadingBidder,
                startDateTime: response.startDateTime ?? combineDateTime(draft.startDate, draft.startTime),
                endDateTime: response.endDateTime ?? combineDateTime(draft.endDate, draft.endTime),
                durationMinutes: response.durationMinutes ?? draft.durationMinutes,
                caratWeight: response.caratWeight ?? draft.caratWeight,
                gramWeight: response.gramWeight ?? draft.gramWeight,
                groupUrl: response.groupUrl ?? draft.groupUrl,
                postUrl: response.postUrl ?? draft.postUrl
            };
            onSchedule(scheduledAuction);
            setScheduleMessage(response.message || 'Auction saved. Remember to post manually on Facebook.');
            onNavigate('overview');
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : 'Unable to schedule the auction.';
            setErrorMessage(reason);
        }
        finally {
            setIsScheduling(false);
        }
    };
    const renderPreviousAuctions = () => {
        if (previousAuctions.length === 0) {
            return (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No auctions yet" }), _jsx("p", { children: "Launch your first auction to view bid velocity, top bidders, and payout status." })] }));
        }
        return (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Current bid" }), _jsx("th", { children: "Bidder" }), _jsx("th", { children: "Actions" })] }) }), _jsx("tbody", { children: previousAuctions.map((auction) => (_jsxs("tr", { children: [_jsx("td", { children: auction.id }), _jsx("td", { children: _jsx("span", { className: `status-chip ${auction.status}`, children: auction.status.charAt(0).toUpperCase() + auction.status.slice(1) }) }), _jsx("td", { children: auction.type === 'live' ? 'Live feed' : 'Post' }), _jsx("td", { children: auction.itemName || '-' }), _jsxs("td", { children: [profile.currency, " ", (auction.currentBid ?? auction.startingPrice).toFixed(2)] }), _jsx("td", { children: auction.leadingBidder || '-' }), _jsx("td", { children: _jsxs("div", { className: "table-actions", children: [_jsx("button", { type: "button", className: "icon-button", onClick: () => onEditAuction(auction), "aria-label": "Edit auction", title: "Edit auction", children: "\u270F\uFE0F" }), _jsx("button", { type: "button", className: "icon-button danger", onClick: () => onDeleteAuction(auction.id), "aria-label": "Delete auction", title: "Delete auction", children: "\uD83D\uDDD1\uFE0F" })] }) })] }, auction.id))) })] }) }));
    };
    return (_jsx("div", { className: "workspace-columns", children: isCreationMode ? (_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: creationHeading }), _jsx("span", { children: "Provide auction details and plan the schedule" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "groupName", children: "Facebook group name" }), _jsx("input", { id: "groupName", value: draft.groupName ?? '', onChange: (event) => onUpdateDraft({ groupName: event.target.value }), placeholder: "e.g. Sapphire Jewellery Auctions" })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "groupUrl", children: "Facebook group URL" }), _jsx("input", { id: "groupUrl", type: "url", placeholder: "https://www.facebook.com/groups/...", value: draft.groupUrl ?? '', onChange: (event) => onUpdateDraft({ groupUrl: event.target.value }) })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemNameDraft", children: "Item name" }), _jsx("input", { id: "itemNameDraft", value: draft.itemName, onChange: (event) => onUpdateDraft({ itemName: event.target.value }), placeholder: "e.g. Premium Mystery Box" })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "postUrl", children: "Facebook post URL (optional)" }), _jsx("input", { id: "postUrl", type: "url", placeholder: "https://www.facebook.com/groups/.../posts/...", value: draft.postUrl ?? '', onChange: (event) => onUpdateDraft({ postUrl: event.target.value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "description", children: "Description" }), _jsx("textarea", { id: "description", rows: 3, value: draft.description, onChange: (event) => onUpdateDraft({ description: event.target.value }), placeholder: "Share item specifics, shipping info, and bidding rules." })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "reserve", children: ["Reserve price (", profile.currency, ")"] }), _jsx("input", { id: "reserve", type: "number", min: 0, value: draft.reservePrice, onChange: (event) => onUpdateDraft({ reservePrice: Number(event.target.value) }) })] }), _jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "starting", children: ["Starting price (", profile.currency, ")"] }), _jsx("input", { id: "starting", type: "number", min: 0, value: draft.startingPrice, onChange: (event) => onUpdateDraft({ startingPrice: Number(event.target.value) }) })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "currentBid", children: ["Current bid (", profile.currency, ")"] }), _jsx("input", { id: "currentBid", type: "number", min: 0, value: draft.currentBid ?? 0, onChange: (event) => onUpdateDraft({ currentBid: Number(event.target.value) }) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "leadingBidder", children: "Leading bidder" }), _jsx("input", { id: "leadingBidder", value: draft.leadingBidder ?? '', onChange: (event) => onUpdateDraft({ leadingBidder: event.target.value }), placeholder: "e.g. Jane Smith" })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "caratWeight", children: "Carat weight" }), _jsx("input", { id: "caratWeight", type: "number", min: 0, step: 0.01, value: draft.caratWeight ?? '', onChange: (event) => handleCaratChange(event.target.value), placeholder: "e.g. 2.5" })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "gramWeight", children: "Gram weight" }), _jsx("input", { id: "gramWeight", type: "number", min: 0, step: 0.01, value: draft.gramWeight ?? '', onChange: (event) => handleGramChange(event.target.value), placeholder: "e.g. 0.5" })] })] }), _jsxs("div", { className: "form-grid three-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "startDate", children: "Start date" }), _jsx("input", { id: "startDate", type: "date", value: draft.startDate ?? '', onChange: (event) => handleStartDateChange(event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "startTime", children: "Start time" }), _jsx("input", { id: "startTime", type: "time", value: draft.startTime ?? '', onChange: (event) => handleStartTimeChange(event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "durationMinutes", children: "Duration (minutes)" }), _jsx("input", { id: "durationMinutes", type: "number", min: 1, value: draft.durationMinutes ?? '', onChange: (event) => handleDurationChange(event.target.value), placeholder: "e.g. 60" })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "endDate", children: "End date" }), _jsx("input", { id: "endDate", type: "date", value: draft.endDate ?? '', onChange: (event) => handleEndDateChange(event.target.value) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "endTime", children: "End time" }), _jsx("input", { id: "endTime", type: "time", value: draft.endTime ?? '', onChange: (event) => handleEndTimeChange(event.target.value) })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "bidIncrement", children: ["Bid increment (", profile.currency, ")"] }), _jsx("input", { id: "bidIncrement", type: "number", min: 1, value: draft.bidIncrement, onChange: (event) => onUpdateDraft({ bidIncrement: Number(event.target.value) }) })] }), mode === 'create-live' ? (_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "interval", children: "Interval between items (minutes)" }), _jsx("input", { id: "interval", type: "number", min: 1, value: draft.intervalBetweenItems ?? 4, onChange: (event) => onUpdateDraft({ intervalBetweenItems: Number(event.target.value) }) }), _jsx("p", { className: "helper-text", children: "Determines pacing of your live feed sequence." })] })) : (_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "autoClose", children: "Auto close after (minutes)" }), _jsx("input", { id: "autoClose", type: "number", min: 5, value: draft.autoCloseMinutes ?? 60, onChange: (event) => onUpdateDraft({ autoCloseMinutes: Number(event.target.value) }) }), _jsx("p", { className: "helper-text", children: "We will close the post automatically after this window." })] }))] }), _jsxs("div", { className: "inline-actions", children: [_jsx("div", { children: _jsx("p", { className: "helper-text", children: disableSchedule
                                            ? 'Complete the required fields above to enable scheduling.'
                                            : 'Ready to launch. Remember to publish the post manually on Facebook.' }) }), _jsx("button", { type: "button", className: "primary-action", onClick: handleSchedule, disabled: disableSchedule, children: isScheduling ? 'Saving...' : mode === 'create-live' ? 'Save live plan' : 'Save post auction' })] }), scheduleMessage && _jsx("div", { className: "success-banner", children: scheduleMessage }), errorMessage && _jsx("div", { className: "error-banner", children: errorMessage })] })] })) : (_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Recent auctions" }), _jsx("span", { children: "Review performance and bidder engagement" })] }), renderPreviousAuctions()] })) }));
};
export default AuctionWorkspace;
