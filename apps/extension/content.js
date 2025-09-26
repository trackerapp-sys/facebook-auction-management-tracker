(function() {
  const OVERLAY_ID = 'auction-scraper-overlay';
  const STYLE_ID = 'auction-scraper-style';

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} { position: fixed; z-index: 2147483647; right: 16px; bottom: 16px; background: #111827; color: #fff; padding: 12px 14px; border-radius: 10px; box-shadow: 0 6px 20px rgba(0,0,0,.35); font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; width: 320px; }
      #${OVERLAY_ID} h3 { margin: 0 0 8px; font-size: 14px; font-weight: 600; }
      #${OVERLAY_ID} .row { display: flex; justify-content: space-between; margin: 4px 0; }
      #${OVERLAY_ID} .small { color: #9ca3af; font-size: 12px; }
      #${OVERLAY_ID} .btn { display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 8px; border: 1px solid #374151; background: #1f2937; color: #fff; cursor: pointer; }
      #${OVERLAY_ID} .btn.primary { background: #2563eb; border-color: #1d4ed8; }
      #${OVERLAY_ID} .btn + .btn { margin-left: 8px; }
      #${OVERLAY_ID} .footer { display: flex; justify-content: flex-end; margin-top: 10px; }
      #${OVERLAY_ID} .success { color: #34d399; font-size: 12px; margin-top: 8px; }
      #${OVERLAY_ID} .error { color: #f87171; font-size: 12px; margin-top: 8px; }
    `;
    document.head.appendChild(style);
  }

  function parseGraphPostIdFromUrl(u) {
    try {
      const url = new URL(u);
      const parts = url.pathname.split('/').filter(Boolean);
      const groupsIdx = parts.indexOf('groups');
      const postsIdx = parts.indexOf('posts');
      if (groupsIdx !== -1 && postsIdx !== -1 && parts[groupsIdx + 1] && parts[postsIdx + 1]) {
        const groupId = parts[groupsIdx + 1];
        const postId = parts[postsIdx + 1];
        if (/^\d+$/.test(groupId) && /^\d+$/.test(postId)) {
          return `${groupId}_${postId}`;
        }
      }
      const permalinkIdx = parts.indexOf('permalink');
      if (permalinkIdx !== -1 && parts[permalinkIdx + 1] && /^\d+$/.test(parts[permalinkIdx + 1])) {
        return parts[permalinkIdx + 1];
      }
      if (postsIdx !== -1 && parts[postsIdx + 1] && /^\d+$/.test(parts[postsIdx + 1])) {
        return parts[postsIdx + 1];
      }
    } catch {}
    return null;
  }

  function extractNumericBid(text) {
    if (!text) return null;
    const m = text.replace(/[,\s]/g, '').match(/(\d+(?:\.\d+)?)/);
    if (!m) return null;
    const num = Number(m[1]);
    return Number.isFinite(num) ? num : null;
  }

  function findComments() {
    // m.facebook.com often uses role="article" and simpler DOM; www is heavier.
    const nodes = [];
    // Basic selectors that may need adjustments over time
    document.querySelectorAll('[role="article"], div[data-ad-preview], div[aria-posinset]').forEach((el) => nodes.push(el));
    return nodes;
  }

  function computeTopBid() {
    const comments = findComments();
    let topBid = 0;
    let topBidder = '';
    for (const node of comments) {
      const text = node.textContent || '';
      const bid = extractNumericBid(text);
      if (bid !== null && bid > topBid) {
        topBid = bid;
        // Heuristic for bidder name: first strong/b tag or first link text in the node
        const nameEl = node.querySelector('strong, b, a');
        topBidder = nameEl?.textContent?.trim() || '';
      }
    }
    return { topBid, topBidder };
  }

  function createOverlay() {
    ensureStyle();
    let el = document.getElementById(OVERLAY_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = OVERLAY_ID;
      document.body.appendChild(el);
    }
    return el;
  }

  function renderOverlay() {
    const container = createOverlay();
    const postUrl = location.href;
    const id = parseGraphPostIdFromUrl(postUrl) || 'unknown';
    const { topBid, topBidder } = computeTopBid();

    container.innerHTML = `
      <h3>Auction Tracker</h3>
      <div class="row"><span class="small">Post</span><span class="small">${id}</span></div>
      <div class="row"><span>Current bid</span><span>${topBid ? topBid.toFixed(2) : '-'}</span></div>
      <div class="row"><span>Leading bidder</span><span>${topBidder || '-'}</span></div>
      <div class="footer">
        <button class="btn" id="copyJsonBtn">Copy JSON</button>
        <button class="btn primary" id="sendBtn">Send to tracker</button>
      </div>
      <div class="small">Keep the post open to update; this panel refreshes when comments change.</div>
      <div id="overlayStatus" class="small"></div>
    `;

    container.querySelector('#copyJsonBtn')?.addEventListener('click', async () => {
      const payload = { postUrl, currentBid: topBid || 0, leadingBidder: topBidder || null, ts: Date.now() };
      try {
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        setStatus('Copied to clipboard', 'success');
      } catch (e) {
        setStatus('Copy failed', 'error');
      }
    });

    container.querySelector('#sendBtn')?.addEventListener('click', async () => {
      const api = (await chrome.storage.sync.get(['apiBase', 'ingestToken'])) || {};
      const apiBase = api.apiBase || 'https://facebook-auction-api.onrender.com';
      const token = api.ingestToken || '';

      const payload = { postUrl, currentBid: topBid || 0, leadingBidder: topBidder || null };
      try {
        const res = await fetch(`${apiBase}/auctions/ingest`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload),
          credentials: 'include'
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }
        setStatus('Sent to tracker', 'success');
      } catch (e) {
        setStatus(`Failed to send: ${e.message || e}`, 'error');
      }
    });
  }

  function setStatus(msg, mode) {
    const status = document.getElementById('overlayStatus');
    if (!status) return;
    status.className = `small ${mode === 'success' ? 'success' : 'error'}`;
    status.textContent = msg;
  }

  // Observe DOM changes to recompute periodically (basic approach)
  const observer = new MutationObserver(() => {
    try { renderOverlay(); } catch {}
  });

  function init() {
    try {
      renderOverlay();
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
    } catch (e) {
      // ignore
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
