import type { AuctionDraft } from '../state';
type DashboardOverviewProps = {
    currency: string;
    timeZone: string;
    previousAuctions: AuctionDraft[];
    onEditAuction: (auction: AuctionDraft) => void;
    onDeleteAuction: (id: string) => void;
};
declare const DashboardOverview: ({ currency, timeZone, previousAuctions, onEditAuction, onDeleteAuction }: DashboardOverviewProps) => import("react/jsx-runtime").JSX.Element;
export default DashboardOverview;
