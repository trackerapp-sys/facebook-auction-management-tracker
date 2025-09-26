import { AuctionDraft } from './state';

type AuctionResponse = {
  auctionId: string;
  status: string;
  message?: string;
  currentBid?: number;
  leadingBidder?: string;
  startDateTime?: string;
  endDateTime?: string;
  durationMinutes?: number;
  caratWeight?: number;
  gramWeight?: number;
  postUrl?: string;
  intervalBetweenItems?: number;
  autoCloseMinutes?: number;
};

const combineDateTime = (date?: string, time?: string) => {
  if (!date || !time) {
    return undefined;
  }
  return `${date}T${time}`;
};

const minutesBetween = (startISO: string, endISO: string): number | undefined => {
  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return undefined;
  }

  return Math.round((end - start) / 60000);
};

export async function scheduleAuction(draft: AuctionDraft): Promise<AuctionResponse> {
  const resolvedStart = draft.startDateTime ?? new Date().toISOString();
  const endISO = draft.endDateTime ?? combineDateTime(draft.endDate, draft.endTime);

  const computedDuration = endISO ? minutesBetween(resolvedStart, endISO) ?? draft.durationMinutes ?? 60 : draft.durationMinutes ?? 60;
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
    postUrl: draft.postUrl?.trim() ? draft.postUrl : undefined,
    intervalBetweenItems: draft.intervalBetweenItems,
    autoCloseMinutes: draft.autoCloseMinutes
  };
}
