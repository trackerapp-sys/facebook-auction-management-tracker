import { useMemo, useState } from 'react';
import {
  AuctionDraft,
  FacebookAuthState,
  FacebookGroup,
  UserProfile
} from '../state';
import { fetchUserGroups, loginWithFacebook, scheduleAuction } from '../services';

const CARAT_TO_GRAM = 0.2;

export type AuctionViewMode = 'manage' | 'create-post' | 'create-live';

type AuctionWorkspaceProps = {
  mode: AuctionViewMode;
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
  mode,
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

  const isCreationMode = mode !== 'manage';
  const creationHeading = useMemo(() => {
    if (mode === 'create-live') {
      return 'Live auction setup';
    }

    if (mode === 'create-post') {
      return 'Post auction setup';
    }

    return 'Auction designer';
  }, [mode]);

  const scheduleCta = mode === 'create-live' ? 'Start live run' : 'Schedule post';
  const canUseDropdown = facebookAuth.isAuthenticated && groups.length > 0;
  const hasSelectedGroup = Boolean(draft.groupId && draft.groupId.trim() !== '');
  const hasManualGroup = Boolean(draft.groupUrl && draft.groupUrl.trim() !== '');

  const parseWeight = (raw: string): number | undefined => {
    if (raw.trim() === '') {
      return undefined;
    }

    const numeric = Number(raw);
    return Number.isNaN(numeric) ? undefined : numeric;
  };

  const handleCaratChange = (raw: string) => {
    const carats = parseWeight(raw);
    if (carats === undefined) {
      onUpdateDraft({ caratWeight: undefined, gramWeight: undefined });
      return;
    }

    const grams = Number((carats * CARAT_TO_GRAM).toFixed(3));
    onUpdateDraft({ caratWeight: carats, gramWeight: grams });
  };

  const handleGramChange = (raw: string) => {
    const grams = parseWeight(raw);
    if (grams === undefined) {
      onUpdateDraft({ gramWeight: undefined, caratWeight: undefined });
      return;
    }

    const carats = Number((grams / CARAT_TO_GRAM).toFixed(3));
    onUpdateDraft({ gramWeight: grams, caratWeight: carats });
  };

  const disableSchedule =
    !isCreationMode ||
    isScheduling ||
    !facebookAuth.isAuthenticated ||
    !draft.itemName.trim() ||
    !(hasSelectedGroup || hasManualGroup);

  const handleFacebookLogin = async () => {
    setIsAuthenticating(true);
    setErrorMessage(null);
    setScheduleMessage(null);
    try {
      const authState = await loginWithFacebook();
      onAuth(authState);
      setScheduleMessage('Connected to Facebook successfully. Loading your groups.');

      const result = await fetchUserGroups();
      onGroups(result);
      setScheduleMessage('Facebook account linked and groups synced.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unable to authenticate with Facebook.';
      setErrorMessage(reason);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRefreshGroups = async () => {
    if (!facebookAuth.isAuthenticated) {
      setErrorMessage('Reconnect Facebook before refreshing groups.');
      return;
    }

    setIsFetchingGroups(true);
    setErrorMessage(null);
    try {
      const result = await fetchUserGroups();
      onGroups(result);
      setScheduleMessage('Groups refreshed from Facebook.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unable to load Facebook groups.';
      setErrorMessage(reason);
    } finally {
      setIsFetchingGroups(false);
    }
  };

  const handleGroupSelect = (value: string) => {
    if (!value) {
      onUpdateDraft({ groupId: undefined });
      return;
    }

    onUpdateDraft({ groupId: value });
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

  const renderPreviousAuctions = () => {
    if (previousAuctions.length === 0) {
      return (
        <div className="empty-state">
          <h3>No auctions yet</h3>
          <p>Launch your first auction to view bid velocity, top bidders, and payout status.</p>
        </div>
      );
    }

    return (
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Type</th>
              <th>Item</th>
              <th>Reserve</th>
              <th>Starting</th>
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
                <td>
                  {profile.currency} {auction.reservePrice.toFixed(2)}
                </td>
                <td>
                  {profile.currency} {auction.startingPrice.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="workspace-columns">
      <section className="panel-card">
        <div className="panel-header">
          <h2>Facebook connection</h2>
          <span>{facebookAuth.isAuthenticated ? 'Account linked' : 'Reconnect to manage auctions'}</span>
        </div>
        <div className="form-grid">
          <div className="inline-actions">
            <div>
              <p className="field-label">Status</p>
              <p className="helper-text">
                {facebookAuth.isAuthenticated
                  ? `Logged in as ${facebookAuth.userName ?? 'Facebook user'} - Token expires ${facebookAuth.expiresAt}`
                  : 'Reconnect your Facebook account to manage group auctions and live feeds.'}
              </p>
            </div>
            <div className="button-stack">
              <button
                type="button"
                className="facebook-button"
                onClick={handleFacebookLogin}
                disabled={isAuthenticating}
              >
                <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden>
                  <path d="M13.5 22V12.75H16.5L17 9H13.5V7C13.5 5.97 13.75 5.25 15.23 5.25H17V2.14C16.12 2.04 15.23 2 14.35 2C11.64 2 9.75 3.66 9.75 6.7V9H7V12.75H9.75V22H13.5Z" />
                </svg>
                {isAuthenticating ? 'Reconnecting...' : 'Login with Facebook'}
              </button>
              <button
                type="button"
                className="ghost-button"
                onClick={handleRefreshGroups}
                disabled={isFetchingGroups || !facebookAuth.isAuthenticated}
              >
                {isFetchingGroups ? 'Refreshing...' : 'Refresh groups'}
              </button>
            </div>
          </div>
          {facebookAuth.isAuthenticated && (
            <div className="list-box">
              <p className="field-label">Available groups</p>
              {isFetchingGroups ? (
                <p className="helper-text">Fetching your moderated group list.</p>
              ) : groups.length === 0 ? (
                <div className="empty-state compact">
                  <h3>No groups detected</h3>
                  <p>
                    Facebook requires additional review before we can load your groups automatically. Enter the
                    group URL manually when creating an auction.
                  </p>
                </div>
              ) : (
                <div className="metric-pills">
                  {groups.map((group) => (
                    <span key={group.id} className="metric-pill">
                      {group.name} - {group.memberCount.toLocaleString()} members
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

      {isCreationMode ? (
        <section className="panel-card">
          <div className="panel-header">
            <h2>{creationHeading}</h2>
            <span>Provide auction details and schedule your next drop</span>
          </div>
          <div className="form-grid">
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="groupSelect">
                  Facebook group
                </label>
                {canUseDropdown ? (
                  <select
                    id="groupSelect"
                    value={draft.groupId ?? ''}
                    onChange={(event) => handleGroupSelect(event.target.value)}
                    disabled={!facebookAuth.isAuthenticated || isFetchingGroups}
                  >
                    <option value="">Select a group</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} - {group.memberCount.toLocaleString()} members
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="manual-group-entry">
                    <input
                      id="groupUrl"
                      type="url"
                      placeholder="https://www.facebook.com/groups/..."
                      value={draft.groupUrl ?? ''}
                      onChange={(event) => onUpdateDraft({ groupUrl: event.target.value, groupId: undefined })}
                    />
                  </div>
                )}
                <p className="helper-text">
                  {canUseDropdown
                    ? 'Select the Facebook group that will host the auction.'
                    : 'Paste the Facebook group URL so we can reference it in reminders and reporting.'}
                </p>
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
              </div>
            </div>
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="caratWeight">
                  Carat weight
                </label>
                <input
                  id="caratWeight"
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.caratWeight ?? ''}
                  onChange={(event) => handleCaratChange(event.target.value)}
                  placeholder="e.g. 2.5"
                />
                <p className="helper-text">Automatically converts to grams for shipping notes.</p>
              </div>
              <div>
                <label className="field-label" htmlFor="gramWeight">
                  Gram weight
                </label>
                <input
                  id="gramWeight"
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.gramWeight ?? ''}
                  onChange={(event) => handleGramChange(event.target.value)}
                  placeholder="e.g. 0.5"
                />
                <p className="helper-text">Adjust either value and we will keep them in sync.</p>
              </div>
            </div>
            {mode === 'create-post' && (
              <div className="form-grid three-columns">
                <div>
                  <label className="field-label" htmlFor="startDateTime">
                    Start time
                  </label>
                  <input
                    id="startDateTime"
                    type="datetime-local"
                    value={draft.startDateTime ?? ''}
                    onChange={(event) => onUpdateDraft({ startDateTime: event.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="endDateTime">
                    End time
                  </label>
                  <input
                    id="endDateTime"
                    type="datetime-local"
                    value={draft.endDateTime ?? ''}
                    onChange={(event) => onUpdateDraft({ endDateTime: event.target.value })}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="durationMinutes">
                    Duration (minutes)
                  </label>
                  <input
                    id="durationMinutes"
                    type="number"
                    min={1}
                    value={draft.durationMinutes ?? ''}
                    onChange={(event) => onUpdateDraft({ durationMinutes: Number(event.target.value) })}
                    placeholder="e.g. 60"
                  />
                </div>
              </div>
            )}
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
              {mode === 'create-live' ? (
                <>
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
                    <p className="helper-text">Determines pacing of your live feed sequence.</p>
                  </div>
                  <div>
                    <label className="field-label" htmlFor="autoClose">
                      Auto close after (minutes)
                    </label>
                    <input
                      id="autoClose"
                      type="number"
                      min={5}
                      value={draft.autoCloseMinutes ?? 60}
                      onChange={(event) => onUpdateDraft({ autoCloseMinutes: Number(event.target.value) })}
                    />
                    <p className="helper-text">We will close the live item automatically after this window.</p>
                  </div>
                </>
              ) : (
                <div>
                  <label className="field-label" htmlFor="postUrl">
                    Facebook post URL (optional)
                  </label>
                  <input
                    id="postUrl"
                    type="url"
                    placeholder="https://www.facebook.com/groups/.../posts/..."
                    value={draft.postUrl ?? ''}
                    onChange={(event) => onUpdateDraft({ postUrl: event.target.value })}
                  />
                  <p className="helper-text">
                    Paste the post URL after publishing so we can track bids and reminders.
                  </p>
                </div>
              )}
            </div>
            <div className="inline-actions">
              <div>
                <p className="helper-text">
                  {disableSchedule
                    ? 'Complete the fields above and ensure Facebook is connected to enable scheduling.'
                    : 'Ready to launch. We will publish through your connected Facebook session.'}
                </p>
              </div>
              <button
                type="button"
                className="primary-action"
                onClick={handleSchedule}
                disabled={disableSchedule}
              >
                {isScheduling ? 'Scheduling...' : scheduleCta}
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="panel-card">
          <div className="panel-header">
            <h2>Recent auctions</h2>
            <span>Review performance and bidder engagement</span>
          </div>
          {renderPreviousAuctions()}
        </section>
      )}
    </div>
  );
};

export default AuctionWorkspace;
