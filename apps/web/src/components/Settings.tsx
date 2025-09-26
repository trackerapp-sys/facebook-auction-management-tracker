import { useEffect, useState } from 'react';
import { listPages, subscribePage } from '../api';

export default function Settings() {
  const [pages, setPages] = useState<Array<{ id: string; name: string; hasToken?: boolean }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadPages = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await listPages();
      setPages(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleSubscribe = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await subscribePage(id);
      setSuccess('Subscribed successfully. Webhooks will deliver comments in real-time.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to subscribe page');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2>Facebook Page integration</h2>
        <span>Connect your Page to receive real-time bid updates via webhooks</span>
      </div>
      <div className="form-grid">
        <button type="button" className="primary-action" onClick={loadPages} disabled={loading}>
          {loading ? 'Loading...' : 'Reload pages'}
        </button>
        {error && <div className="error-banner">{error}</div>}
        {success && <div className="success-banner">{success}</div>}
        {pages.length === 0 ? (
          <div className="empty-state">
            <h3>No pages found</h3>
            <p>Ensure you have granted page permissions during Facebook login.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Page</th>
                  <th>Token</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name}</td>
                    <td>{p.hasToken ? 'available' : 'missing'}</td>
                    <td>
                      <button className="icon-button" type="button" onClick={() => handleSubscribe(p.id)} title="Subscribe to feed">
                        🔔
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
