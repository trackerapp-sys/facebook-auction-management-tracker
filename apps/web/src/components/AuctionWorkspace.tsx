import { useEffect, useMemo, useState } from 'react';
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

const formatDate = (value: Date) => value.toISOString().slice(0, 10);
const formatTime = (value: Date) => value.toISOString().slice(11, 16);

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

  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  return { date, time };
};

const diffInMinutes = (startISO?: string, endISO?: string): number | undefined => {
  if (!startISO || !endISO) {
    return undefined;
  }

  const start = new Date(startISO).getTime();
  const end = new Date(endISO).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return undefined;
  }

  return Math.round((end - start) / 60000);
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
  const creationHeading = useMemo(() => {
    if (mode === 'create-live') {
      return 'Live auction setup';
    }

    if (mode === 'create-post') {
      return 'Post auction setup';
    }

    return 'Auction designer';
  }, [mode]);

  useEffect(() => {
    if (!isCreationMode) {
      return;
    }

    const now = new Date();
    const updates: Partial<AuctionDraft> = {};

    if (!draft.startDate) {
      updates.startDate = formatDate(now);
    }
    if (!draft.startTime) {
      updates.startTime = formatTime(now);
    }
    if (!draft.durationMinutes) {
      updates.durationMinutes = 60;
    }
    if (draft.currentBid === undefined) {
      updates.currentBid = draft.startingPrice || 0;
    }
    if (!draft.leadingBidder) {
      updates.leadingBidder = '';
    }

    if (Object.keys(updates).length > 0) {
      onUpdateDraft(updates);
    }
  }, [isCreationMode, draft.startDate, draft.startTime, draft.durationMinutes, draft.currentBid, draft.leadingBidder, draft.startingPrice, onUpdateDraft]);

  useEffect(() => {
    if (!isCreationMode) {
      return;
    }

    const startISO = combineDateTime(draft.startDate, draft.startTime);
    if (startISO) {
      const duration = draft.durationMinutes ?? 60;
      const startDate = new Date(startISO);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + duration * 60000);
        onUpdateDraft({
          startDateTime: startISO,
          endDateTime: endDate.toISOString(),
          endDate: formatDate(endDate),
          endTime: formatTime(endDate)
        });
      }
    }
  }, [isCreationMode, draft.startDate, draft.startTime, draft.durationMinutes, onUpdateDraft]);

  const handleCaratChange = (raw: string) => {
    if (raw.trim() === '') {
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
    if (raw.trim() === '') {
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

  const handleDurationChange = (raw: string) => {
    const value = Number(raw);
    if (Number.isNaN(value) || value <= 0) {
      onUpdateDraft({ durationMinutes: undefined });
      return;
    }

    const startISO = combineDateTime(draft.startDate, draft.startTime);
    if (!startISO) {
      onUpdateDraft({ durationMinutes: value });
      return;
    }

    const startDate = new Date(startISO);
    if (Number.isNaN(startDate.getTime())) {
      onUpdateDraft({ durationMinutes: value });
      return;
    }

    const endDate = new Date(startDate.getTime() + value * 60000);
    onUpdateDraft({
      durationMinutes: value,
      endDate: formatDate(endDate),
      endTime: formatTime(endDate),
      endDateTime: endDate.toISOString()
    });
  };

  const handleStartDateChange = (value: string) => {
    const updates: Partial<AuctionDraft> = {
      startDate: value || undefined
    };
    const startISO = combineDateTime(value || undefined, draft.startTime);
    if (startISO) {
      const duration = draft.durationMinutes ?? 60;
      const startDate = new Date(startISO);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + duration * 60000);
        updates.startDateTime = startISO;
        updates.endDate = formatDate(endDate);
        updates.endTime = formatTime(endDate);
        updates.endDateTime = endDate.toISOString();
      }
    }
    onUpdateDraft(updates);
  };

  const handleStartTimeChange = (value: string) => {
    const updates: Partial<AuctionDraft> = {
      startTime: value || undefined
    };
    const startISO = combineDateTime(draft.startDate, value || undefined);
    if (startISO) {
      const duration = draft.durationMinutes ?? 60;
      const startDate = new Date(startISO);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = new Date(startDate.getTime() + duration * 60000);
        updates.startDateTime = startISO;
        updates.endDate = formatDate(endDate);
        updates.endTime = formatTime(endDate);
        updates.endDateTime = endDate.toISOString();
      }
    }
    onUpdateDraft(updates);
  };

  const handleEndDateChange = (value: string) => {
    const endISO = combineDateTime(value || undefined, draft.endTime);
    const updates: Partial<AuctionDraft> = {
      endDate: value || undefined,
      endDateTime: endISO
    };

    const startISO = combineDateTime(draft.startDate, draft.startTime);
    const newDuration = diffInMinutes(startISO, endISO);
    if (newDuration !== undefined) {
      updates.durationMinutes = newDuration;
    }

    onUpdateDraft(updates);
  };

  const handleEndTimeChange = (value: string) => {
    const endISO = combineDateTime(draft.endDate, value || undefined);
    const updates: Partial<AuctionDraft> = {
      endTime: value || undefined,
      endDateTime: endISO
    };

    const startISO = combineDateTime(draft.startDate, draft.startTime);
    const newDuration = diffInMinutes(startISO, endISO);
    if (newDuration !== undefined) {
      updates.durationMinutes = newDuration;
    }

    onUpdateDraft(updates);
  };

  const disableSchedule =
    !isCreationMode ||
    isScheduling ||
    !draft.itemName.trim() ||
    !draft.groupName?.trim() ||
    !draft.groupUrl?.trim();

  const handleSchedule = async () => {
    setIsScheduling(true);
    setScheduleMessage(null);
    setErrorMessage(null);
    try {
      const response = await scheduleAuction(draft);
      const scheduledAuction: AuctionDraft = {
        ...draft,
        id: response.auctionId,
        status: 'scheduled',
        currentBid: response.currentBid ?? draft.currentBid ?? draft.startingPrice,
        leadingBidder: response.leadingBidder ?? draft.leadingBidder,
        startDateTime: response.startDateTime ?? combineDateTime(draft.startDate, draft.startTime),
        endDateTime: response.endDateTime ?? combineDateTime(draft.endDate, draft.endTime),
        durationMinutes: response.durationMinutes ?? draft.durationMinutes,
        caratWeight: response.caratWeight ?? draft.caratWeight,
        gramWeight: response.gramWeight ?? draft.gramWeight,
        groupUrl: response.groupUrl ?? draft.groupUrl,
        postUrl: response.postUrl ?? draft.postUrl
      };
      onSchedule(scheduledAuction);
      setScheduleMessage(response.message || 'Auction saved. Remember to post manually on Facebook.');
      onNavigate('overview');
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
              <th>Current bid</th>
              <th>Bidder</th>
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

  return (
    <div className="workspace-columns">
      {isCreationMode ? (
        <section className="panel-card">
          <div className="panel-header">
            <h2>{creationHeading}</h2>
            <span>Provide auction details and plan the schedule</span>
          </div>
          <div className="form-grid">
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="groupName">
                  Facebook group name
                </label>
                <input
                  id="groupName"
                  value={draft.groupName ?? ''}
                  onChange={(event) => onUpdateDraft({ groupName: event.target.value })}
                  placeholder="e.g. Sapphire Jewellery Auctions"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="groupUrl">
                  Facebook group URL
                </label>
                <input
                  id="groupUrl"
                  type="url"
                  placeholder="https://www.facebook.com/groups/..."
                  value={draft.groupUrl ?? ''}
                  onChange={(event) => onUpdateDraft({ groupUrl: event.target.value })}
                />
              </div>
            </div>
            <div className="form-grid two-columns">
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
                <label className="field-label" htmlFor="currentBid">
                  Current bid ({profile.currency})
                </label>
                <input
                  id="currentBid"
                  type="number"
                  min={0}
                  value={draft.currentBid ?? 0}
                  onChange={(event) => onUpdateDraft({ currentBid: Number(event.target.value) })}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="leadingBidder">
                  Leading bidder
                </label>
                <input
                  id="leadingBidder"
                  value={draft.leadingBidder ?? ''}
                  onChange={(event) => onUpdateDraft({ leadingBidder: event.target.value })}
                  placeholder="e.g. Jane Smith"
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
              </div>
            </div>
            <div className="form-grid three-columns">
              <div>
                <label className="field-label" htmlFor="startDate">
                  Start date
                </label>
                <input
                  id="startDate"
                  type="date"
                  value={draft.startDate ?? ''}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="startTime">
                  Start time
                </label>
                <input
                  id="startTime"
                  type="time"
                  value={draft.startTime ?? ''}
                  onChange={(event) => handleStartTimeChange(event.target.value)}
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
                  onChange={(event) => handleDurationChange(event.target.value)}
                  placeholder="e.g. 60"
                />
              </div>
            </div>
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="endDate">
                  End date
                </label>
                <input
                  id="endDate"
                  type="date"
                  value={draft.endDate ?? ''}
                  onChange={(event) => handleEndDateChange(event.target.value)}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="endTime">
                  End time
                </label>
                <input
                  id="endTime"
                  type="time"
                  value={draft.endTime ?? ''}
                  onChange={(event) => handleEndTimeChange(event.target.value)}
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
              {mode === 'create-live' ? (
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
              ) : (
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
                  <p className="helper-text">We will close the post automatically after this window.</p>
                </div>
              )}
            </div>
            <div className="inline-actions">
              <div>
                <p className="helper-text">
                  {disableSchedule
                    ? 'Complete the required fields above to enable scheduling.'
                    : 'Ready to launch. Remember to publish the post manually on Facebook.'}
                </p>
              </div>
              <button
                type="button"
                className="primary-action"
                onClick={handleSchedule}
                disabled={disableSchedule}
              >
                {isScheduling ? 'Saving...' : mode === 'create-live' ? 'Save live plan' : 'Save post auction'}
              </button>
            </div>
            {scheduleMessage && <div className="success-banner">{scheduleMessage}</div>}
            {errorMessage && <div className="error-banner">{errorMessage}</div>}
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
