import type { AuctionDraft } from '../state';
type DashboardOverviewProps = {
    currency: string;
    previousAuctions: AuctionDraft[];
};
declare const DashboardOverview: ({ currency, previousAuctions }: DashboardOverviewProps) => import("react/jsx-runtime").JSX.Element;
export default DashboardOverview;
