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
    groupUrl?: string;
    postUrl?: string;
};
export declare function scheduleAuction(draft: AuctionDraft): Promise<AuctionResponse>;
export {};
