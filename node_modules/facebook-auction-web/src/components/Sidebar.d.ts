import type { FC } from 'react';
type SectionKey = 'overview' | 'auctions' | 'inventory' | 'analytics' | 'settings';
type SidebarProps = {
    displayName: string;
    activeSection: SectionKey;
    onNavigate: (key: SectionKey) => void;
};
declare const Sidebar: FC<SidebarProps>;
export default Sidebar;
