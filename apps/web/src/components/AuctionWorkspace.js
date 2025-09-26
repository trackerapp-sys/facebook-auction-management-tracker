import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { fetchUserGroups, loginWithFacebook, scheduleAuction } from '../services';
const CARAT_TO_GRAM = 0.2;
const AuctionWorkspace = ({ mode, profile, facebookAuth, groups, draft, previousAuctions, onUpdateDraft, onAuth, onGroups, onSchedule }) => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isFetchingGroups, setIsFetchingGroups] = useState(false);
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
    const scheduleCta = mode === 'create-live' ? 'Start live run' : 'Schedule post';
    const canUseDropdown = facebookAuth.isAuthenticated && groups.length > 0;
    const hasSelectedGroup = Boolean(draft.groupId && draft.groupId.trim() !== '');
    const hasManualGroup = Boolean(draft.groupUrl && draft.groupUrl.trim() !== '');
    const parseWeight = (raw) => {
        if (raw.trim() === '') {
            return undefined;
        }
        const numeric = Number(raw);
        return Number.isNaN(numeric) ? undefined : numeric;
    };
    const handleCaratChange = (raw) => {
        const carats = parseWeight(raw);
        if (carats === undefined) {
            onUpdateDraft({ caratWeight: undefined, gramWeight: undefined });
            return;
        }
        const grams = Number((carats * CARAT_TO_GRAM).toFixed(3));
        onUpdateDraft({ caratWeight: carats, gramWeight: grams });
    };
    const handleGramChange = (raw) => {
        const grams = parseWeight(raw);
        if (grams === undefined) {
            onUpdateDraft({ gramWeight: undefined, caratWeight: undefined });
            return;
        }
        const carats = Number((grams / CARAT_TO_GRAM).toFixed(3));
        onUpdateDraft({ gramWeight: grams, caratWeight: carats });
    };
    const disableSchedule = !isCreationMode ||
        isScheduling ||
        !facebookAuth.isAuthenticated ||
        !draft.itemName.trim() ||
        !(hasSelectedGroup || hasManualGroup);
    const handleFacebookLogin = async () => {
        setIsAuthenticating(true);
        setErrorMessage(null);
        setScheduleMessage(null);
        try {
            const authState = await loginWithFacebook();
            onAuth(authState);
            setScheduleMessage('Connected to Facebook successfully. Loading your groups.');
            const result = await fetchUserGroups();
            onGroups(result);
            setScheduleMessage('Facebook account linked and groups synced.');
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : 'Unable to authenticate with Facebook.';
            setErrorMessage(reason);
        }
        finally {
            setIsAuthenticating(false);
        }
    };
    const handleRefreshGroups = async () => {
        if (!facebookAuth.isAuthenticated) {
            setErrorMessage('Reconnect Facebook before refreshing groups.');
            return;
        }
        setIsFetchingGroups(true);
        setErrorMessage(null);
        try {
            const result = await fetchUserGroups();
            onGroups(result);
            setScheduleMessage('Groups refreshed from Facebook.');
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : 'Unable to load Facebook groups.';
            setErrorMessage(reason);
        }
        finally {
            setIsFetchingGroups(false);
        }
    };
    const handleGroupSelect = (value) => {
        if (!value) {
            onUpdateDraft({ groupId: undefined });
            return;
        }
        onUpdateDraft({ groupId: value });
    };
    const handleSchedule = async () => {
        setIsScheduling(true);
        setScheduleMessage(null);
        setErrorMessage(null);
        try {
            const response = await scheduleAuction(draft);
            const scheduledAuction = {
                ...draft,
                id: response.auctionId,
                status: 'scheduled'
            };
            onSchedule(scheduledAuction);
            setScheduleMessage(response.message || 'Auction scheduled successfully.');
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
        return (_jsx("div", { className: "table-wrapper", children: _jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Type" }), _jsx("th", { children: "Item" }), _jsx("th", { children: "Reserve" }), _jsx("th", { children: "Starting" })] }) }), _jsx("tbody", { children: previousAuctions.map((auction) => (_jsxs("tr", { children: [_jsx("td", { children: auction.id }), _jsx("td", { children: _jsx("span", { className: `status-chip ${auction.status}`, children: auction.status.charAt(0).toUpperCase() + auction.status.slice(1) }) }), _jsx("td", { children: auction.type === 'live' ? 'Live feed' : 'Post' }), _jsx("td", { children: auction.itemName || '-' }), _jsxs("td", { children: [profile.currency, " ", auction.reservePrice.toFixed(2)] }), _jsxs("td", { children: [profile.currency, " ", auction.startingPrice.toFixed(2)] })] }, auction.id))) })] }) }));
    };
    return (_jsxs("div", { className: "workspace-columns", children: [_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Facebook connection" }), _jsx("span", { children: facebookAuth.isAuthenticated ? 'Account linked' : 'Reconnect to manage auctions' })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "inline-actions", children: [_jsxs("div", { children: [_jsx("p", { className: "field-label", children: "Status" }), _jsx("p", { className: "helper-text", children: facebookAuth.isAuthenticated
                                                    ? `Logged in as ${facebookAuth.userName ?? 'Facebook user'} - Token expires ${facebookAuth.expiresAt}`
                                                    : 'Reconnect your Facebook account to manage group auctions and live feeds.' })] }), _jsxs("div", { className: "button-stack", children: [_jsxs("button", { type: "button", className: "facebook-button", onClick: handleFacebookLogin, disabled: isAuthenticating, children: [_jsx("svg", { viewBox: "0 0 24 24", fill: "currentColor", role: "img", "aria-hidden": true, children: _jsx("path", { d: "M13.5 22V12.75H16.5L17 9H13.5V7C13.5 5.97 13.75 5.25 15.23 5.25H17V2.14C16.12 2.04 15.23 2 14.35 2C11.64 2 9.75 3.66 9.75 6.7V9H7V12.75H9.75V22H13.5Z" }) }), isAuthenticating ? 'Reconnecting...' : 'Login with Facebook'] }), _jsx("button", { type: "button", className: "ghost-button", onClick: handleRefreshGroups, disabled: isFetchingGroups || !facebookAuth.isAuthenticated, children: isFetchingGroups ? 'Refreshing...' : 'Refresh groups' })] })] }), facebookAuth.isAuthenticated && (_jsxs("div", { className: "list-box", children: [_jsx("p", { className: "field-label", children: "Available groups" }), isFetchingGroups ? (_jsx("p", { className: "helper-text", children: "Fetching your moderated group list." })) : groups.length === 0 ? (_jsxs("div", { className: "empty-state compact", children: [_jsx("h3", { children: "No groups detected" }), _jsx("p", { children: "Facebook requires additional review before we can load your groups automatically. Enter the group URL manually when creating an auction." })] })) : (_jsx("div", { className: "metric-pills", children: groups.map((group) => (_jsxs("span", { className: "metric-pill", children: [group.name, " - ", group.memberCount.toLocaleString(), " members"] }, group.id))) }))] })), scheduleMessage && _jsx("div", { className: "success-banner", children: scheduleMessage }), errorMessage && _jsx("div", { className: "error-banner", children: errorMessage })] })] }), isCreationMode ? (_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: creationHeading }), _jsx("span", { children: "Provide auction details and schedule your next drop" })] }), _jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "groupSelect", children: "Facebook group" }), canUseDropdown ? (_jsxs("select", { id: "groupSelect", value: draft.groupId ?? '', onChange: (event) => handleGroupSelect(event.target.value), disabled: !facebookAuth.isAuthenticated || isFetchingGroups, children: [_jsx("option", { value: "", children: "Select a group" }), groups.map((group) => (_jsxs("option", { value: group.id, children: [group.name, " - ", group.memberCount.toLocaleString(), " members"] }, group.id)))] })) : (_jsx("div", { className: "manual-group-entry", children: _jsx("input", { id: "groupUrl", type: "url", placeholder: "https://www.facebook.com/groups/...", value: draft.groupUrl ?? '', onChange: (event) => onUpdateDraft({ groupUrl: event.target.value, groupId: undefined }) }) })), _jsx("p", { className: "helper-text", children: canUseDropdown
                                                    ? 'Select the Facebook group that will host the auction.'
                                                    : 'Paste the Facebook group URL so we can reference it in reminders and reporting.' })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemNameDraft", children: "Item name" }), _jsx("input", { id: "itemNameDraft", value: draft.itemName, onChange: (event) => onUpdateDraft({ itemName: event.target.value }), placeholder: "e.g. Premium Mystery Box" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "description", children: "Description" }), _jsx("textarea", { id: "description", rows: 3, value: draft.description, onChange: (event) => onUpdateDraft({ description: event.target.value }), placeholder: "Share item specifics, shipping info, and bidding rules." })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "reserve", children: ["Reserve price (", profile.currency, ")"] }), _jsx("input", { id: "reserve", type: "number", min: 0, value: draft.reservePrice, onChange: (event) => onUpdateDraft({ reservePrice: Number(event.target.value) }) })] }), _jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "starting", children: ["Starting price (", profile.currency, ")"] }), _jsx("input", { id: "starting", type: "number", min: 0, value: draft.startingPrice, onChange: (event) => onUpdateDraft({ startingPrice: Number(event.target.value) }) })] })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "caratWeight", children: "Carat weight" }), _jsx("input", { id: "caratWeight", type: "number", min: 0, step: 0.01, value: draft.caratWeight ?? '', onChange: (event) => handleCaratChange(event.target.value), placeholder: "e.g. 2.5" }), _jsx("p", { className: "helper-text", children: "Automatically converts to grams for shipping notes." })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "gramWeight", children: "Gram weight" }), _jsx("input", { id: "gramWeight", type: "number", min: 0, step: 0.01, value: draft.gramWeight ?? '', onChange: (event) => handleGramChange(event.target.value), placeholder: "e.g. 0.5" }), _jsx("p", { className: "helper-text", children: "Adjust either value and we will keep them in sync." })] })] }), mode === 'create-post' && (_jsxs("div", { className: "form-grid three-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "startDateTime", children: "Start time" }), _jsx("input", { id: "startDateTime", type: "datetime-local", value: draft.startDateTime ?? '', onChange: (event) => onUpdateDraft({ startDateTime: event.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "endDateTime", children: "End time" }), _jsx("input", { id: "endDateTime", type: "datetime-local", value: draft.endDateTime ?? '', onChange: (event) => onUpdateDraft({ endDateTime: event.target.value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "durationMinutes", children: "Duration (minutes)" }), _jsx("input", { id: "durationMinutes", type: "number", min: 1, value: draft.durationMinutes ?? '', onChange: (event) => onUpdateDraft({ durationMinutes: Number(event.target.value) }), placeholder: "e.g. 60" })] })] })), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsxs("label", { className: "field-label", htmlFor: "bidIncrement", children: ["Bid increment (", profile.currency, ")"] }), _jsx("input", { id: "bidIncrement", type: "number", min: 1, value: draft.bidIncrement, onChange: (event) => onUpdateDraft({ bidIncrement: Number(event.target.value) }) })] }), mode === 'create-live' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "interval", children: "Interval between items (minutes)" }), _jsx("input", { id: "interval", type: "number", min: 1, value: draft.intervalBetweenItems ?? 4, onChange: (event) => onUpdateDraft({ intervalBetweenItems: Number(event.target.value) }) }), _jsx("p", { className: "helper-text", children: "Determines pacing of your live feed sequence." })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "autoClose", children: "Auto close after (minutes)" }), _jsx("input", { id: "autoClose", type: "number", min: 5, value: draft.autoCloseMinutes ?? 60, onChange: (event) => onUpdateDraft({ autoCloseMinutes: Number(event.target.value) }) }), _jsx("p", { className: "helper-text", children: "We will close the live item automatically after this window." })] })] })) : (_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "postUrl", children: "Facebook post URL (optional)" }), _jsx("input", { id: "postUrl", type: "url", placeholder: "https://www.facebook.com/groups/.../posts/...", value: draft.postUrl ?? '', onChange: (event) => onUpdateDraft({ postUrl: event.target.value }) }), _jsx("p", { className: "helper-text", children: "Paste the post URL after publishing so we can track bids and reminders." })] }))] }), _jsxs("div", { className: "inline-actions", children: [_jsx("div", { children: _jsx("p", { className: "helper-text", children: disableSchedule
                                                ? 'Complete the fields above and ensure Facebook is connected to enable scheduling.'
                                                : 'Ready to launch. We will publish through your connected Facebook session.' }) }), _jsx("button", { type: "button", className: "primary-action", onClick: handleSchedule, disabled: disableSchedule, children: isScheduling ? 'Scheduling...' : scheduleCta })] })] })] })) : (_jsxs("section", { className: "panel-card", children: [_jsxs("div", { className: "panel-header", children: [_jsx("h2", { children: "Recent auctions" }), _jsx("span", { children: "Review performance and bidder engagement" })] }), renderPreviousAuctions()] }))] }));
};
export default AuctionWorkspace;
