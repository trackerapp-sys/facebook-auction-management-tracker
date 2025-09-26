import { ReactNode } from 'react';
export type BusinessType = 'individual' | 'business';
export type AuctionType = 'post' | 'live';
export interface InventoryItem {
    id: string;
    name: string;
    description: string;
    reservePrice: number;
    startingPrice: number;
    quantity: number;
}
export interface PaymentMethodConfig {
    id: string;
    label: string;
    details: string;
    isPreferred: boolean;
}
export interface UserProfile {
    displayName: string;
    businessType: BusinessType;
    timeZone: string;
    currency: string;
    bidMonitoringInterval: number;
    inventory: InventoryItem[];
    paymentMethods: PaymentMethodConfig[];
}
export interface AuctionDraft {
    id: string;
    type: AuctionType;
    itemName: string;
    description: string;
    reservePrice: number;
    startingPrice: number;
    bidIncrement: number;
    postUrl?: string;
    endDate?: string;
    endTime?: string;
    endDateTime?: string;
    startDateTime?: string;
    durationMinutes?: number;
    caratWeight?: number;
    gramWeight?: number;
    intervalBetweenItems?: number;
    autoCloseMinutes?: number;
    currentBid?: number;
    leadingBidder?: string;
    status: 'draft' | 'scheduled' | 'live' | 'closed';
}
export interface AppState {
    profile: UserProfile | null;
    auctionDraft: AuctionDraft;
    previousAuctions: AuctionDraft[];
}
export type AppStateAction = {
    type: 'complete-onboarding';
    payload: UserProfile;
} | {
    type: 'update-auction-draft';
    payload: Partial<AuctionDraft>;
} | {
    type: 'add-auction';
    payload: AuctionDraft;
} | {
    type: 'delete-auction';
    payload: string;
};
interface ProviderProps {
    children: ReactNode;
}
export declare function AppStateProvider({ children }: ProviderProps): import("react/jsx-runtime").JSX.Element;
export declare function useAppState(): {
    state: AppState;
    dispatch: (action: AppStateAction) => void;
};
export {};
