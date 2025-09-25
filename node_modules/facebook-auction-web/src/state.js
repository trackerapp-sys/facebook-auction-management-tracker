import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useReducer } from 'react';
const STORAGE_KEY = 'facebook-auction-manager-state';
const STATE_VERSION = 2;
const defaultAuctionDraft = {
    id: 'draft-1',
    type: 'post',
    itemName: '',
    description: '',
    reservePrice: 0,
    startingPrice: 0,
    bidIncrement: 1,
    status: 'draft'
};
const initialState = {
    profile: null,
    facebookAuth: { isAuthenticated: false },
    groups: [],
    auctionDraft: defaultAuctionDraft,
    previousAuctions: []
};
function hydrateState(raw) {
    if (!raw || typeof raw !== 'object') {
        return initialState;
    }
    const parsed = raw;
    return {
        ...initialState,
        ...parsed,
        profile: parsed.profile ?? initialState.profile,
        facebookAuth: { ...initialState.facebookAuth, ...(parsed.facebookAuth ?? {}) },
        groups: parsed.groups ?? initialState.groups,
        auctionDraft: { ...defaultAuctionDraft, ...(parsed.auctionDraft ?? {}) },
        previousAuctions: parsed.previousAuctions ?? initialState.previousAuctions
    };
}
function initializeState() {
    if (typeof window === 'undefined') {
        return initialState;
    }
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return initialState;
        }
        const parsed = JSON.parse(stored);
        if (parsed &&
            typeof parsed === 'object' &&
            'version' in parsed &&
            'data' in parsed &&
            parsed.version === STATE_VERSION) {
            const payload = parsed;
            return hydrateState(payload.data);
        }
        return initialState;
    }
    catch (error) {
        console.warn('Failed to parse stored state, falling back to defaults', error);
        return initialState;
    }
}
function appStateReducer(state, action) {
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
const AppStateContext = createContext({
    state: initialState,
    dispatch: () => undefined
});
export function AppStateProvider({ children }) {
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
    return (_jsx(AppStateContext.Provider, { value: { state, dispatch }, children: children }));
}
export function useAppState() {
    const ctx = useContext(AppStateContext);
    if (!ctx) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return ctx;
}
