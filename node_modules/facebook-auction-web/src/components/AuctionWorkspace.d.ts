import { AuctionDraft, FacebookAuthState, FacebookGroup, UserProfile } from '../state';
type AuctionWorkspaceProps = {
    profile: UserProfile;
    facebookAuth: FacebookAuthState;
    groups: FacebookGroup[];
    draft: AuctionDraft;
    previousAuctions: AuctionDraft[];
    onUpdateDraft: (payload: Partial<AuctionDraft>) => void;
    onAuth: (payload: FacebookAuthState) => void;
    onGroups: (payload: FacebookGroup[]) => void;
    onSchedule: (payload: AuctionDraft) => void;
};
declare const AuctionWorkspace: ({ profile, facebookAuth, groups, draft, previousAuctions, onUpdateDraft, onAuth, onGroups, onSchedule }: AuctionWorkspaceProps) => import("react/jsx-runtime").JSX.Element;
export default AuctionWorkspace;
