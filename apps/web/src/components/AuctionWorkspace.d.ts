import type { AuctionDraft, UserProfile } from '../state';
import type { SectionKey } from './Sidebar';
export type AuctionViewMode = 'manage' | 'create-post' | 'create-live';
type AuctionWorkspaceProps = {
    mode: AuctionViewMode;
    profile: UserProfile;
    draft: AuctionDraft;
    previousAuctions: AuctionDraft[];
    onUpdateDraft: (payload: Partial<AuctionDraft>) => void;
    onSchedule: (payload: AuctionDraft) => void;
    onDeleteAuction: (id: string) => void;
    onEditAuction: (auction: AuctionDraft) => void;
    onNavigate: (section: SectionKey) => void;
};
declare const AuctionWorkspace: ({ mode, profile, draft, previousAuctions, onUpdateDraft, onSchedule, onDeleteAuction, onEditAuction, onNavigate }: AuctionWorkspaceProps) => import("react/jsx-runtime").JSX.Element;
export default AuctionWorkspace;
