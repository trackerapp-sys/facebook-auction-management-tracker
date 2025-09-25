import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer } from 'react';
const defaultAuctionDraft = {
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
const initialState = {
    profile: null,
    facebookAuth: { isAuthenticated: false },
    groups: [],
    auctionDraft: defaultAuctionDraft,
    previousAuctions: []
};
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
    const [state, dispatch] = useReducer(appStateReducer, initialState);
    return (_jsx(AppStateContext.Provider, { value: { state, dispatch }, children: children }));
}
export function useAppState() {
    const ctx = useContext(AppStateContext);
    if (!ctx) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return ctx;
}
