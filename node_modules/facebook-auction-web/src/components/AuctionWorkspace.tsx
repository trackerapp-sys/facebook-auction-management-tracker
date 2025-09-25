import { useEffect, useState } from 'react';
import {
  AuctionDraft,
  FacebookAuthState,
  FacebookGroup,
  UserProfile
} from '../state';
import {
  checkFacebookSession,
  fetchUserGroups,
  loginWithFacebook,
  scheduleAuction
} from '../services';

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

const AuctionWorkspace = ({
  profile,
  facebookAuth,
  groups,
  draft,
  previousAuctions,
  onUpdateDraft,
  onAuth,
  onGroups,
  onSchedule
}: AuctionWorkspaceProps) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFetchingGroups, setIsFetchingGroups] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const initialiseSession = async () => {
      try {
        const session = await checkFacebookSession();
        if (!mounted || !session.isAuthenticated) {
          return;
        }
        onAuth(session);
        setIsFetchingGroups(true);
        const fetchedGroups = await fetchUserGroups();
        if (mounted) {
          onGroups(fetchedGroups);
        }
      } catch (err) {
        console.warn('Failed to initialise Facebook session', err);
      } finally {
        if (mounted) {
          setIsFetchingGroups(false);
        }
      }
    };

    void initialiseSession();
    return () => {
      mounted = false;
    };
  }, [onAuth, onGroups]);

  const handleFacebookLogin = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setScheduleMessage(null);
    try {
      const authState = await loginWithFacebook();
      onAuth(authState);
      setScheduleMessage('Connected to Facebook successfully. Loading your groups…');
      setIsFetchingGroups(true);
      const result = await fetchUserGroups();
      onGroups(result);
      setScheduleMessage('Facebook account linked and groups synced.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unable to authenticate with Facebook.';
      setErrorMessage(reason);
    } finally {
      setIsAuthenticating(false);
      setIsFetchingGroups(false);
    }
  };

  const handleTypeChange = (type: 'post' | 'live') => {
    onUpdateDraft({ type, intervalBetweenItems: type === 'live' ? 4 : undefined });
  };

  const handleSchedule = async () => {
    setIsScheduling(true);
    setScheduleMessage(null);
    setErrorMessage(null);
    try {
      const response = await scheduleAuction(draft);
      const scheduledAuction: AuctionDraft = {
        ...draft,
        id: response.auctionId,
        status: 'scheduled'
      };
      onSchedule(scheduledAuction);
      setScheduleMessage(response.message || 'Auction scheduled successfully.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unable to schedule the auction.';
      setErrorMessage(reason);
    } finally {
      setIsScheduling(false);
    }
  };

  const disableSchedule =
    !facebookAuth.isAuthenticated || !draft.groupId || !draft.itemName.trim() || isScheduling;

  return (
    <div className="content-section">
      <section className="panel-card">
        <div className="panel-header">
          <h2>Facebook connection</h2>
          <span>{facebookAuth.isAuthenticated ? 'Account linked' : 'Authenticate to access groups'}</span>
        </div>
        <div className="form-grid">
          <div className="inline-actions">
            <div>
              <p className="field-label">Status</p>
              <p className="helper-text">
                {facebookAuth.isAuthenticated
                  ? `Logged in as ${facebookAuth.userName ?? 'Facebook user'} · Token expires ${facebookAuth.expiresAt}`
                  : 'Connect your Facebook account to manage group auctions and live feeds.'}
              </p>
            </div>
            <button
              type="button"
              className="facebook-button"
              onClick={handleFacebookLogin}
              disabled={isAuthenticating}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden>
                <path d="M13.5 22V12.75H16.5L17 9H13.5V7C13.5 5.97 13.75 5.25 15.23 5.25H17V2.14C16.12 2.04 15.23 2 14.35 2C11.64 2 9.75 3.66 9.75 6.7V9H7V12.75H9.75V22H13.5Z" />
              </svg>
              {isAuthenticating ? 'Connecting…' : facebookAuth.isAuthenticated ? 'Reconnect' : 'Login with Facebook'}
            </button>
          </div>
          {facebookAuth.isAuthenticated && (
            <div className="list-box">
              <p className="field-label">Available groups</p>
              {isFetchingGroups ? (
                <p className="helper-text">Fetching your moderated group list…</p>
              ) : groups.length === 0 ? (
                <div className="empty-state">
                  <h3>No groups loaded yet</h3>
                  <p>Use the button above to refresh groups once you have admin permissions.</p>
                </div>
              ) : (
                <div className="metric-pills">
                  {groups.map((group) => (
                    <span key={group.id} className="metric-pill">
                      {group.name} · {group.memberCount.toLocaleString()} members
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {scheduleMessage && <div className="success-banner">{scheduleMessage}</div>}
          {errorMessage && <div className="error-banner">{errorMessage}</div>}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Auction designer</h2>
          <span>Craft a high-performing drop</span>
        </div>
        <div className="form-grid">
          <div>
            <label className="field-label">Auction type</label>
            <div className="tab-switcher">
              <button
                type="button"
                className={draft.type === 'post' ? 'active' : ''}
                onClick={() => handleTypeChange('post')}
              >
                Individual post
              </button>
              <button
                type="button"
                className={draft.type === 'live' ? 'active' : ''}
                onClick={() => handleTypeChange('live')}
              >
                Live feed
              </button>
            </div>
            <p className="helper-text">
              {draft.type === 'post'
                ? 'We will schedule a single post with bidding monitored via comments.'
                : 'Stream multiple items in sequence. Bids are tracked in real time from live comments.'}
            </p>
          </div>
          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="groupSelect">
                Facebook group
              </label>
              <select
                id="groupSelect"
                value={draft.groupId ?? ''}
                onChange={(event) => onUpdateDraft({ groupId: event.target.value })}
                disabled={!facebookAuth.isAuthenticated || isFetchingGroups}
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name} · {group.memberCount.toLocaleString()} members
                  </option>
                ))}
              </select>
              {!facebookAuth.isAuthenticated && (
                <p className="helper-text">Connect Facebook to load the groups you manage.</p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="itemNameDraft">
                Item name
              </label>
              <input
                id="itemNameDraft"
                value={draft.itemName}
                onChange={(event) => onUpdateDraft({ itemName: event.target.value })}
                placeholder="e.g. Premium Mystery Box"
              />
            </div>
          </div>
          <div>
            <label className="field-label" htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={draft.description}
              onChange={(event) => onUpdateDraft({ description: event.target.value })}
              placeholder="Share item specifics, shipping info, and bidding rules."
            />
          </div>
          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="reserve">
                Reserve price ({profile.currency})
              </label>
              <input
                id="reserve"
                type="number"
                min={0}
                value={draft.reservePrice}
                onChange={(event) => onUpdateDraft({ reservePrice: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="starting">
                Starting price ({profile.currency})
              </label>
              <input
                id="starting"
                type="number"
                min={0}
                value={draft.startingPrice}
                onChange={(event) => onUpdateDraft({ startingPrice: Number(event.target.value) })}
              />
              <p className="helper-text">
                Kick off below reserve to spark a bidding war, or match reserve for straight-forward sales.
              </p>
            </div>
          </div>
          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="bidIncrement">
                Bid increment ({profile.currency})
              </label>
              <input
                id="bidIncrement"
                type="number"
                min={1}
                value={draft.bidIncrement}
                onChange={(event) => onUpdateDraft({ bidIncrement: Number(event.target.value) })}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="autoClose">
                Auto close after (minutes)
              </label>
              <input
                id="autoClose"
                type="number"
                min={5}
                value={draft.autoCloseMinutes}
                onChange={(event) => onUpdateDraft({ autoCloseMinutes: Number(event.target.value) })}
              />
            </div>
          </div>
          {draft.type === 'live' && (
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="interval">
                  Interval between items (minutes)
                </label>
                <input
                  id="interval"
                  type="number"
                  min={1}
                  value={draft.intervalBetweenItems ?? 4}
                  onChange={(event) =>
                    onUpdateDraft({ intervalBetweenItems: Number(event.target.value) })
                  }
                />
                <p className="helper-text">
                  Determines pacing of your live feed. We will prompt you when it is time to switch items.
                </p>
              </div>
              <div>
                <span className="badge-live">Live assistant enabled</span>
                <p className="helper-text">
                  Real-time comment polling keeps your leaderboard updated without refreshing Facebook.
                </p>
              </div>
            </div>
          )}
          <div className="inline-actions">
            <div>
              <p className="helper-text">
                {disableSchedule
                  ? 'Complete the fields above and link Facebook to enable scheduling.'
                  : 'Ready to launch. We will publish through your connected Facebook session.'}
              </p>
            </div>
            <button
              type="button"
              className="primary-action"
              onClick={handleSchedule}
              disabled={disableSchedule}
            >
              {isScheduling ? 'Scheduling…' : draft.type === 'live' ? 'Start live run' : 'Schedule post'}
            </button>
          </div>
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Recent auctions</h2>
          <span>Review performance and bidder engagement</span>
        </div>
        {previousAuctions.length === 0 ? (
          <div className="empty-state">
            <h3>No auctions yet</h3>
            <p>Launch your first auction to view bid velocity, top bidders, and payout status.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Type</th>
                  <th>Item</th>
                  <th>Reserve</th>
                  <th>Starting</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {previousAuctions.map((auction) => (
                  <tr key={auction.id}>
                    <td>{auction.id}</td>
                    <td>{auction.type === 'live' ? 'Live feed' : 'Post'}</td>
                    <td>{auction.itemName || '—'}</td>
                    <td>
                      {profile.currency} {auction.reservePrice.toFixed(2)}
                    </td>
                    <td>
                      {profile.currency} {auction.startingPrice.toFixed(2)}
                    </td>
                    <td>
                      <span className={`status-chip ${auction.status}`}>
                        {auction.status.charAt(0).toUpperCase() + auction.status.slice(1)}
                      </span>
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

export default AuctionWorkspace;
