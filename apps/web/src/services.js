const combineDateTime = (date, time) => {
    if (!date || !time) {
        return undefined;
    }
    return `${date}T${time}`;
};
const minutesBetween = (startISO, endISO) => {
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
export async function scheduleAuction(draft) {
    const startISO = draft.startDateTime ?? combineDateTime(draft.startDate, draft.startTime);
    const endISO = draft.endDateTime ?? combineDateTime(draft.endDate, draft.endTime);
    const computedDuration = draft.durationMinutes ?? minutesBetween(startISO, endISO) ?? 60;
    const resolvedStart = startISO ?? new Date().toISOString();
    const resolvedEnd = endISO ?? new Date(new Date(resolvedStart).getTime() + computedDuration * 60000).toISOString();
    const auctionId = draft.id.startsWith('draft-') ? `auction-${Date.now()}` : draft.id;
    return {
        auctionId,
        status: 'scheduled',
        message: 'Auction saved locally. Publish to Facebook when you are ready.',
        currentBid: draft.currentBid ?? draft.startingPrice,
        leadingBidder: draft.leadingBidder?.trim() ? draft.leadingBidder : undefined,
        startDateTime: resolvedStart,
        endDateTime: resolvedEnd,
        durationMinutes: computedDuration,
        caratWeight: draft.caratWeight,
        gramWeight: draft.gramWeight,
        groupUrl: draft.groupUrl?.trim() ? draft.groupUrl : undefined,
        postUrl: draft.postUrl?.trim() ? draft.postUrl : undefined
    };
}
