(async function() {
  const existing = await chrome.storage.sync.get(['apiBase', 'ingestToken']);
  document.getElementById('apiBase').value = existing.apiBase || 'https://facebook-auction-api.onrender.com';
  document.getElementById('ingestToken').value = existing.ingestToken || '';

  document.getElementById('saveBtn').addEventListener('click', async () => {
    const apiBase = document.getElementById('apiBase').value.trim();
    const ingestToken = document.getElementById('ingestToken').value.trim();
    await chrome.storage.sync.set({ apiBase, ingestToken });
    document.getElementById('status').textContent = 'Saved';
    setTimeout(() => (document.getElementById('status').textContent = ''), 1500);
  });
})();
