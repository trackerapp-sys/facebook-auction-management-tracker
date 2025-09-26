import { createContext, ReactNode, useContext, useEffect, useReducer } from 'react';

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

export type AppStateAction =
  | { type: 'complete-onboarding'; payload: UserProfile }
  | { type: 'update-auction-draft'; payload: Partial<AuctionDraft> }
  | { type: 'add-auction'; payload: AuctionDraft }
  | { type: 'delete-auction'; payload: string };

const STORAGE_KEY = 'auction-tracker-state';
const STATE_VERSION = 5;

const defaultAuctionDraft: AuctionDraft = {
  id: 'draft-1',
  type: 'post',
  itemName: '',
  description: '',
  reservePrice: 0,
  startingPrice: 0,
  bidIncrement: 1,
  intervalBetweenItems: 4,
  autoCloseMinutes: 60,
  status: 'draft'
};

const initialState: AppState = {
  profile: null,
  auctionDraft: defaultAuctionDraft,
  previousAuctions: []
};

function hydrateState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    return initialState;
  }

  const parsed = raw as Partial<AppState>;

  return {
    ...initialState,
    ...parsed,
    profile: parsed.profile ?? initialState.profile,
    auctionDraft: { ...defaultAuctionDraft, ...(parsed.auctionDraft ?? {}) },
    previousAuctions: parsed.previousAuctions ?? initialState.previousAuctions
  };
}

function initializeState(): AppState {
  if (typeof window === 'undefined') {
    return initialState;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return initialState;
    }

    const parsed = JSON.parse(stored) as unknown;
    if (
      parsed &&
      typeof parsed === 'object' &&
      'version' in parsed &&
      'data' in parsed &&
      (parsed as { version: unknown }).version === STATE_VERSION
    ) {
      const payload = parsed as { version: number; data: unknown };
      return hydrateState(payload.data);
    }

    return initialState;
  } catch (error) {
    console.warn('Failed to parse stored state, falling back to defaults', error);
    return initialState;
  }
}

function appStateReducer(state: AppState, action: AppStateAction): AppState {
  switch (action.type) {
    case 'complete-onboarding':
      return { ...state, profile: action.payload };
    case 'update-auction-draft':
      return {
        ...state,
        auctionDraft: { ...state.auctionDraft, ...action.payload }
      };
    case 'add-auction': {
      const nextAuctions = [
        action.payload,
        ...state.previousAuctions.filter((auction) => auction.id !== action.payload.id)
      ];
      return {
        ...state,
        previousAuctions: nextAuctions,
        auctionDraft: { ...defaultAuctionDraft, id: `draft-${Date.now()}` }
      };
    }
    case 'delete-auction':
      return {
        ...state,
        previousAuctions: state.previousAuctions.filter((auction) => auction.id !== action.payload)
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
  const [state, dispatch] = useReducer(appStateReducer, initialState, initializeState);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const payload = {
      version: STATE_VERSION,
      data: state
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [state]);

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
