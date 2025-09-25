import { AuctionDraft, FacebookAuthState, FacebookGroup } from './state';
type AuctionResponse = {
    auctionId: string;
    status: string;
    platformReference?: string;
    message?: string;
};
export declare function loginWithFacebook(): Promise<FacebookAuthState>;
export declare function checkFacebookSession(): Promise<FacebookAuthState>;
export declare function fetchUserGroups(): Promise<FacebookGroup[]>;
export declare function scheduleAuction(draft: AuctionDraft): Promise<AuctionResponse>;
export declare function logoutOfFacebook(): Promise<void>;
export {};
