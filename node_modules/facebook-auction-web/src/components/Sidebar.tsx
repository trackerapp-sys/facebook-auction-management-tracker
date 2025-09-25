import type { FC } from 'react';

type SectionKey = 'overview' | 'auctions' | 'inventory' | 'analytics' | 'settings';

type SidebarProps = {
  displayName: string;
  activeSection: SectionKey;
  onNavigate: (key: SectionKey) => void;
};

const sections: Array<{ key: SectionKey; label: string; description: string; icon: string }> = [
  { key: 'overview', label: 'Overview', description: 'Key stats & updates', icon: '📊' },
  { key: 'auctions', label: 'Auctions', description: 'Manage live + post auctions', icon: '⚡' },
  { key: 'inventory', label: 'Inventory', description: 'Catalogue items & stock', icon: '📦' },
  { key: 'analytics', label: 'Insights', description: 'Performance analytics', icon: '📈' },
  { key: 'settings', label: 'Settings', description: 'Brand preferences', icon: '⚙️' }
];

const Sidebar: FC<SidebarProps> = ({ displayName, activeSection, onNavigate }) => {
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
        {sections.map(({ key, label, description, icon }) => {
          const isActive = key === activeSection;
          return (
            <button
              key={key}
              type="button"
              className={`nav-button ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(key)}
            >
              <div className="nav-icon" aria-hidden>{icon}</div>
              <div>
                <span>{label}</span>
                <small>{description}</small>
              </div>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <p className="footer-title">Need to run multiple auctions?</p>
        <p className="footer-copy">Upgrade to unlock AI-assisted bid moderation and advanced analytics.</p>
        <button type="button" className="upgrade-button">Explore Pro</button>
      </div>
    </aside>
  );
};

export default Sidebar;
