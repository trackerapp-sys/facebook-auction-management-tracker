import type { FC } from 'react';

export type SectionKey =
  | 'overview'
  | 'auctions/manage'
  | 'auctions/create-post'
  | 'auctions/create-live'
  | 'inventory'
  | 'analytics'
  | 'settings';

type SidebarProps = {
  displayName: string;
  activeSection: SectionKey;
  onNavigate: (key: SectionKey) => void;
};

type NavEntry = {
  key: SectionKey;
  label: string;
  description: string;
  icon: string;
};

type NavGroup = {
  key: 'auctions';
  label: string;
  description: string;
  icon: string;
  target: SectionKey;
  children: NavEntry[];
};

type NavItem = NavEntry | NavGroup;

const navItems: NavItem[] = [
  { key: 'overview', label: 'Overview', description: 'Key stats & activity', icon: '📊' },
  {
    key: 'auctions',
    label: 'Auctions',
    description: 'Plan, publish, and monitor',
    icon: '🛎️',
    target: 'auctions/manage',
    children: [
      { key: 'auctions/manage', label: 'Manage auctions', description: 'Facebook link & schedule', icon: '📋' },
      { key: 'auctions/create-post', label: 'Create post auction', description: 'Single post drop', icon: '📝' },
      { key: 'auctions/create-live', label: 'Create live auction', description: 'Sequenced live sale', icon: '🎥' }
    ]
  },
  { key: 'inventory', label: 'Inventory', description: 'Catalogue items & stock', icon: '📦' },
  { key: 'analytics', label: 'Insights', description: 'Performance analytics', icon: '📈' },
  { key: 'settings', label: 'Settings', description: 'Brand preferences', icon: '⚙️' }
];

const Sidebar: FC<SidebarProps> = ({ displayName, activeSection, onNavigate }) => {
  const renderNavButton = (item: NavEntry, isActive: boolean) => (
    <button
      key={item.key}
      type="button"
      className={`nav-button ${isActive ? 'active' : ''}`}
      onClick={() => onNavigate(item.key)}
    >
      <div className="nav-icon" aria-hidden>
        {item.icon}
      </div>
      <div>
        <span>{item.label}</span>
        <small>{item.description}</small>
      </div>
    </button>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-mark">FA</span>
        <div>
          <strong>Facebook Auctions</strong>
          <p>Management Studio</p>
        </div>
      </div>
      <div className="welcome-card">
        <span className="badge success">Seller profile</span>
        <h2>Hello, {displayName}</h2>
        <p>Stay on top of live bids, scheduled drops, and bidder follow-ups.</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          if ('children' in item) {
            const isParentActive = item.children.some((child) => child.key === activeSection);
            return (
              <div key={item.key} className={`nav-group ${isParentActive ? 'expanded' : ''}`}>
                {renderNavButton(
                  {
                    key: item.target,
                    label: item.label,
                    description: item.description,
                    icon: item.icon
                  },
                  isParentActive || item.target === activeSection
                )}
                <div className="sub-nav">
                  {item.children.map((child) => renderNavButton(child, child.key === activeSection))}
                </div>
              </div>
            );
          }

          return renderNavButton(item, item.key === activeSection);
        })}
      </nav>
      <div className="sidebar-footer">
        <p className="footer-title">Need to run multiple auctions?</p>
        <p className="footer-copy">Upgrade to unlock AI-assisted bid moderation and advanced analytics.</p>
        <button type="button" className="upgrade-button">
          Explore Pro
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
