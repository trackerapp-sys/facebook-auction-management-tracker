import type { AuctionDraft } from '../state';
type DashboardOverviewProps = {
    currency: string;
    previousAuctions: AuctionDraft[];
    onEditAuction: (auction: AuctionDraft) => void;
    onDeleteAuction: (id: string) => void;
};
declare const DashboardOverview: ({ currency, previousAuctions, onEditAuction, onDeleteAuction }: DashboardOverviewProps) => import("react/jsx-runtime").JSX.Element;
export default DashboardOverview;
