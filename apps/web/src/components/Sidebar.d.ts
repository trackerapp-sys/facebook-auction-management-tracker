import type { FC } from 'react';
export type SectionKey = 'overview' | 'auctions/manage' | 'auctions/create-post' | 'auctions/create-live' | 'inventory' | 'analytics' | 'settings';
type SidebarProps = {
    displayName: string;
    activeSection: SectionKey;
    onNavigate: (key: SectionKey) => void;
};
declare const Sidebar: FC<SidebarProps>;
export default Sidebar;
