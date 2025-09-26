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
export declare function scheduleAuction(draft: AuctionDraft): Promise<AuctionResponse>;
export {};
