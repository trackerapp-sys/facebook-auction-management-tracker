import { createContext, ReactNode, useContext, useReducer } from 'react';

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
  itemName: string;
  description: string;
  reservePrice: number;
  startingPrice: number;
  bidIncrement: number;
  autoCloseMinutes: number;
  intervalBetweenItems?: number;
  status: 'draft' | 'scheduled' | 'live' | 'closed';
}

export interface AppState {
  profile: UserProfile | null;
  facebookAuth: FacebookAuthState;
  groups: FacebookGroup[];
  auctionDraft: AuctionDraft;
  previousAuctions: AuctionDraft[];
}

export type AppStateAction =
  | { type: 'complete-onboarding'; payload: UserProfile }
  | { type: 'update-auction-draft'; payload: Partial<AuctionDraft> }
  | { type: 'set-facebook-auth'; payload: FacebookAuthState }
  | { type: 'set-facebook-groups'; payload: FacebookGroup[] }
  | { type: 'add-auction'; payload: AuctionDraft };

const defaultAuctionDraft: AuctionDraft = {
  id: 'draft-1',
  type: 'post',
  itemName: '',
  description: '',
  reservePrice: 0,
  startingPrice: 0,
  bidIncrement: 1,
  autoCloseMinutes: 60,
  status: 'draft'
};

const initialState: AppState = {
  profile: null,
  facebookAuth: { isAuthenticated: false },
  groups: [],
  auctionDraft: defaultAuctionDraft,
  previousAuctions: []
};

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'complete-onboarding':
      return { ...state, profile: action.payload };
    case 'update-auction-draft':
      return {
        ...state,
        auctionDraft: { ...state.auctionDraft, ...action.payload }
      };
    case 'set-facebook-auth':
      return { ...state, facebookAuth: action.payload };
    case 'set-facebook-groups':
      return { ...state, groups: action.payload };
    case 'add-auction':
      return {
        ...state,
        previousAuctions: [action.payload, ...state.previousAuctions],
        auctionDraft: { ...defaultAuctionDraft, id: `draft-${Date.now()}` }
      };
    default:
      return state;
  }
}

const AppStateContext = createContext<{
  state: AppState;
  dispatch: (action: AppStateAction) => void;
}>({
  state: initialState,
  dispatch: () => undefined
});

interface ProviderProps {
  children: ReactNode;
}

export function AppStateProvider({ children }: ProviderProps) {
  const [state, dispatch] = useReducer(appStateReducer, initialState);

  return (
    <AppStateContext.Provider value={{ state, dispatch }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error('useAppState must be used within AppStateProvider');
  }
  return ctx;
}
