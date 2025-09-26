import { useMemo, useState } from 'react';
import type { AuctionDraft, UserProfile } from '../state';
import type { SectionKey } from './Sidebar';
import { scheduleAuction } from '../services';

const CARAT_TO_GRAM = 0.2;

export type AuctionViewMode = 'manage' | 'create-post' | 'create-live';

type AuctionWorkspaceProps = {
  mode: AuctionViewMode;
  profile: UserProfile;
  draft: AuctionDraft;
  previousAuctions: AuctionDraft[];
  onUpdateDraft: (payload: Partial<AuctionDraft>) => void;
  onSchedule: (payload: AuctionDraft) => void;
  onDeleteAuction: (id: string) => void;
  onEditAuction: (auction: AuctionDraft) => void;
  onNavigate: (section: SectionKey) => void;
};

const combineDateTime = (date?: string, time?: string) => {
  if (!date || !time) {
    return undefined;
  }

  return `${date}T${time}`;
};

const splitDateTime = (value?: string): { date?: string; time?: string } => {
  if (!value) {
    return {};
  }

  return {
    date: value.slice(0, 10),
    time: value.slice(11, 16)
  };
};

const AuctionWorkspace = ({
  mode,
  profile,
  draft,
  previousAuctions,
  onUpdateDraft,
  onSchedule,
  onDeleteAuction,
  onEditAuction,
  onNavigate
}: AuctionWorkspaceProps) => {
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCreationMode = mode !== 'manage';
  const isPostMode = mode === 'create-post';

  const endDateValue = draft.endDate ?? splitDateTime(draft.endDateTime).date ?? '';
  const endTimeValue = draft.endTime ?? splitDateTime(draft.endDateTime).time ?? '';

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: profile.timeZone
      }),
    [profile.timeZone]
  );

  const formatDateTime = (value?: string) => {
    if (!value) {
      return '-';
    }

    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return '-';
      }
      return dateFormatter.format(date);
    } catch {
      return value;
    }
  };

  const handleEndDateChange = (value: string) => {
    onUpdateDraft({
      endDate: value || undefined,
      endDateTime: combineDateTime(value || undefined, endTimeValue || undefined)
    });
  };

  const handleEndTimeChange = (value: string) => {
    onUpdateDraft({
      endTime: value || undefined,
      endDateTime: combineDateTime(endDateValue || undefined, value || undefined)
    });
  };

  const handleCaratChange = (raw: string) => {
    if (!raw.trim()) {
      onUpdateDraft({ caratWeight: undefined, gramWeight: undefined });
      return;
    }

    const carats = Number(raw);
    if (Number.isNaN(carats)) {
      return;
    }

    const grams = Number((carats * CARAT_TO_GRAM).toFixed(3));
    onUpdateDraft({ caratWeight: carats, gramWeight: grams });
  };

  const handleGramChange = (raw: string) => {
    if (!raw.trim()) {
      onUpdateDraft({ gramWeight: undefined, caratWeight: undefined });
      return;
    }

    const grams = Number(raw);
    if (Number.isNaN(grams)) {
      return;
    }

    const carats = Number((grams / CARAT_TO_GRAM).toFixed(3));
    onUpdateDraft({ gramWeight: grams, caratWeight: carats });
  };

  const disableSchedule =
    isScheduling ||
    !draft.itemName.trim() ||
    (isPostMode && !draft.postUrl?.trim()) ||
    (isPostMode && !combineDateTime(endDateValue || undefined, endTimeValue || undefined));

  const handleSchedule = async () => {
    setIsScheduling(true);
    setScheduleMessage(null);
    setErrorMessage(null);

    try {
      const response = await scheduleAuction(draft);
      const resolvedEnd = response.endDateTime ?? draft.endDateTime ?? combineDateTime(endDateValue || undefined, endTimeValue || undefined);
      const { date: endDate, time: endTime } = splitDateTime(resolvedEnd);

      const scheduledAuction: AuctionDraft = {
        ...draft,
        id: response.auctionId,
        status: 'scheduled',
        currentBid: response.currentBid ?? draft.currentBid ?? draft.startingPrice,
        leadingBidder: response.leadingBidder ?? draft.leadingBidder,
        startDateTime: response.startDateTime,
        endDateTime: resolvedEnd,
        endDate,
        endTime,
        durationMinutes: response.durationMinutes ?? draft.durationMinutes,
        caratWeight: response.caratWeight ?? draft.caratWeight,
        gramWeight: response.gramWeight ?? draft.gramWeight,
        postUrl: response.postUrl ?? draft.postUrl,
        intervalBetweenItems: response.intervalBetweenItems ?? draft.intervalBetweenItems,
        autoCloseMinutes: response.autoCloseMinutes ?? draft.autoCloseMinutes
      };

      onSchedule(scheduledAuction);
      setScheduleMessage(response.message || 'Auction details saved locally.');
      onNavigate('overview');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save the auction.';
      setErrorMessage(message);
    } finally {
      setIsScheduling(false);
    }
  };

  const renderPreviousAuctions = () => {
    if (previousAuctions.length === 0) {
      return (
        <div className="empty-state">
          <h3>No auctions yet</h3>
          <p>Create your first auction to track bids and bidder activity.</p>
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
              <th>Current bid</th>
              <th>Bidder</th>
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
                <td>
                  {profile.currency} {(auction.currentBid ?? auction.startingPrice).toFixed(2)}
                </td>
                <td>{auction.leadingBidder || '-'}</td>
                <td>{formatDateTime(auction.endDateTime)}</td>
                <td>
                  <div className="table-actions">
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
    );
  };

  if (!isCreationMode) {
    return <section className="panel-card">{renderPreviousAuctions()}</section>;
  }

  return (
    <div className="workspace-columns">
      <section className="panel-card">
        <div className="panel-header">
          <h2>{mode === 'create-live' ? 'Live auction setup' : 'Post auction setup'}</h2>
          <span>Capture the essentials and save this drop to the tracker</span>
        </div>
        <div className="form-grid">
          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="itemNameDraft">
                Auction title
              </label>
              <input
                id="itemNameDraft"
                value={draft.itemName}
                onChange={(event) => onUpdateDraft({ itemName: event.target.value })}
                placeholder="e.g. Sapphire Cocktail Ring"
              />
            </div>
            {isPostMode && (
              <div>
                <label className="field-label" htmlFor="postUrl">
                  Facebook post URL
                </label>
                <input
                  id="postUrl"
                  type="url"
                  placeholder="https://www.facebook.com/groups/.../posts/..."
                  value={draft.postUrl ?? ''}
                  onChange={(event) => onUpdateDraft({ postUrl: event.target.value })}
                />
                <p className="helper-text">Needed so the tracker can monitor bids for this post.</p>
              </div>
            )}
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
              placeholder="Share item specifics, shipping info, payment terms, and auction rules."
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
              <label className="field-label" htmlFor="endDate">
                Auction end date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDateValue}
                onChange={(event) => handleEndDateChange(event.target.value)}
              />
            </div>
          </div>

          <div className="form-grid two-columns">
            <div>
              <label className="field-label" htmlFor="endTime">
                Auction end time
              </label>
              <input
                id="endTime"
                type="time"
                value={endTimeValue}
                onChange={(event) => handleEndTimeChange(event.target.value)}
              />
              <p className="helper-text">Times are displayed in your timezone ({profile.timeZone}).</p>
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
                placeholder="e.g. 0.85"
              />
              <p className="helper-text">Carat value updates automatically when you edit grams.</p>
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
                placeholder="e.g. 4.25"
              />
            </div>
            {mode === 'create-live' && (
              <div>
                <label className="field-label" htmlFor="interval">
                  Interval between items (minutes)
                </label>
                <input
                  id="interval"
                  type="number"
                  min={1}
                  value={draft.intervalBetweenItems ?? 4}
                  onChange={(event) => onUpdateDraft({ intervalBetweenItems: Number(event.target.value) })}
                />
                <p className="helper-text">Controls pacing for your live sequence.</p>
              </div>
            )}
          </div>

          {mode === 'create-live' && (
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
            </div>
          )}

          <div className="inline-actions">
            <div>
              <p className="helper-text">
                {disableSchedule
                  ? 'Provide the required information above to enable saving.'
                  : 'All set. Save the auction and keep bidding updates in one place.'}
              </p>
            </div>
            <button type="button" className="primary-action" onClick={handleSchedule} disabled={disableSchedule}>
              {isScheduling ? 'Saving...' : 'Save auction'}
            </button>
          </div>

          {scheduleMessage && <div className="success-banner">{scheduleMessage}</div>}
          {errorMessage && <div className="error-banner">{errorMessage}</div>}
        </div>
      </section>

      <section className="panel-card">
        <div className="panel-header">
          <h2>Saved auctions</h2>
          <span>Quick view of current and past drops</span>
        </div>
        {renderPreviousAuctions()}
      </section>
    </div>
  );
};

export default AuctionWorkspace;
