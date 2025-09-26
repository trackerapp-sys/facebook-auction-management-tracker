import type { AuctionDraft } from '../state';

type DashboardOverviewProps = {
  currency: string;
  timeZone: string;
  previousAuctions: AuctionDraft[];
  onEditAuction: (auction: AuctionDraft) => void;
  onDeleteAuction: (id: string) => void;
  onFetchBids?: (id: string) => Promise<void>;
};

const formatCurrency = (currency: string, value?: number) => {
  if (value === undefined || Number.isNaN(value)) {
    return `${currency} 0.00`;
  }

  return `${currency} ${value.toFixed(2)}`;
};

const DashboardOverview = ({
  currency,
  timeZone,
  previousAuctions,
  onEditAuction,
  onDeleteAuction,
  onFetchBids
}: DashboardOverviewProps) => {
  const activeAuctions = previousAuctions.filter((auction) => auction.status === 'scheduled' || auction.status === 'live');
  const completedAuctions = previousAuctions.filter((auction) => auction.status === 'closed');

  const formatDateTime = (value?: string) => {
    if (!value) {
      return '-';
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '-';
      }
      return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone
      }).format(date);
    } catch {
      return value;
    }
  };

  return (
    <div className="dashboard-wrapper">
      <div className="summary-grid">
        <div className="summary-card">
          <span className="summary-label">Active auctions</span>
          <span className="summary-value">{activeAuctions.length}</span>
          <span className="summary-subtext">Scheduled or currently live</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Completed</span>
          <span className="summary-value">{completedAuctions.length}</span>
          <span className="summary-subtext">Auctions closed this session</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Currency</span>
          <span className="summary-value">{currency}</span>
          <span className="summary-subtext">Configured in onboarding</span>
        </div>
      </div>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Current & recent auctions</h2>
          <span>Track live progress and revisit outcomes</span>
        </div>
        {previousAuctions.length === 0 ? (
          <div className="empty-state">
            <h3>No auctions yet</h3>
            <p>Create your first post or live auction to see it appear here.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Current bid</th>
                  <th>Leading bidder</th>
                  <th>Reserve</th>
                  <th>Starting</th>
                  <th>Ends</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {previousAuctions.map((auction) => (
                  <tr key={auction.id}>
                    <td>{auction.id}</td>
                    <td>
                      <span className={`status-chip ${auction.status}`}>
                        {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                      </span>
                    </td>
                    <td>{auction.type === 'live' ? 'Live feed' : 'Post'}</td>
                    <td>{auction.itemName || '-'}</td>
                    <td>{formatCurrency(currency, auction.currentBid ?? auction.startingPrice)}</td>
                    <td>{auction.leadingBidder || '-'}</td>
                    <td>{formatCurrency(currency, auction.reservePrice)}</td>
                    <td>{formatCurrency(currency, auction.startingPrice)}</td>
                    <td>{formatDateTime(auction.endDateTime)}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => onFetchBids?.(auction.id)}
                          aria-label="Fetch latest bids"
                          title="Fetch latest bids"
                        >
                          🔄
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => onEditAuction(auction)}
                          aria-label="Edit auction"
                          title="Edit auction"
                        >
                          ✏️
                        </button>
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => onDeleteAuction(auction.id)}
                          aria-label="Delete auction"
                          title="Delete auction"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default DashboardOverview;