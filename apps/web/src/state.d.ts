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
export interface FacebookGroup {
    id: string;
    name: string;
    memberCount: number;
    privacy: 'public' | 'private';
}
export interface FacebookAuthState {
    isAuthenticated: boolean;
    userName?: string;
    userId?: string;
    expiresAt?: string;
}
export interface AuctionDraft {
    id: string;
    type: AuctionType;
    groupId?: string;
    groupUrl?: string;
    postUrl?: string;
    itemName: string;
    description: string;
    reservePrice: number;
    startingPrice: number;
    bidIncrement: number;
    autoCloseMinutes?: number;
    intervalBetweenItems?: number;
    caratWeight?: number;
    gramWeight?: number;
    startDateTime?: string;
    endDateTime?: string;
    durationMinutes?: number;
    status: 'draft' | 'scheduled' | 'live' | 'closed';
}
export interface AppState {
    profile: UserProfile | null;
    facebookAuth: FacebookAuthState;
    groups: FacebookGroup[];
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
    type: 'set-facebook-auth';
    payload: FacebookAuthState;
} | {
    type: 'set-facebook-groups';
    payload: FacebookGroup[];
} | {
    type: 'add-auction';
    payload: AuctionDraft;
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
