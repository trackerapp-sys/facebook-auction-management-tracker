const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
const SESSION_POLL_INTERVAL = 2000;
const SESSION_POLL_TIMEOUT = 120000;
async function apiFetch(path, init = {}) {
    const headers = new Headers(init.headers || {});
    if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        credentials: 'include',
        headers
    });
    if (!response.ok) {
        let details = 'Request failed';
        try {
            const payload = await response.json();
            details = payload.error ?? JSON.stringify(payload);
        }
        catch (_err) {
            // ignore parsing error
        }
        throw new Error(details);
    }
    if (response.status === 204) {
        return undefined;
    }
    return (await response.json());
}
export async function loginWithFacebook() {
    if (typeof window === 'undefined') {
        throw new Error('Facebook login is only available in the browser.');
    }
    const { authUrl } = await apiFetch('/auth/facebook/url');
    const popup = window.open(authUrl, 'facebookLogin', 'width=600,height=720');
    if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
    }
    return new Promise((resolve, reject) => {
        const start = Date.now();
        const poll = async () => {
            if (Date.now() - start > SESSION_POLL_TIMEOUT) {
                popup.close();
                reject(new Error('Facebook login timed out.'));
                return;
            }
            try {
                const session = await checkFacebookSession();
                if (session.isAuthenticated) {
                    popup.close();
                    resolve(session);
                    return;
                }
            }
            catch (err) {
                console.warn('Session poll failed', err);
            }
            if (popup.closed) {
                reject(new Error('Facebook login window was closed before completion.'));
                return;
            }
            window.setTimeout(poll, SESSION_POLL_INTERVAL);
        };
        poll();
    });
}
export async function checkFacebookSession() {
    try {
        return await apiFetch('/auth/facebook/session');
    }
    catch (err) {
        console.error('Failed to check Facebook session', err);
        return { isAuthenticated: false };
    }
}
export async function fetchUserGroups() {
    return apiFetch('/facebook/groups');
}
export async function scheduleAuction(draft) {
    return apiFetch('/auctions', {
        method: 'POST',
        body: JSON.stringify({
            id: draft.id,
            type: draft.type,
            itemName: draft.itemName,
            description: draft.description,
            groupId: draft.groupId,
            reservePrice: draft.reservePrice,
            startingPrice: draft.startingPrice,
            bidIncrement: draft.bidIncrement,
            autoCloseMinutes: draft.autoCloseMinutes,
            intervalBetweenItems: draft.intervalBetweenItems
        })
    });
}
export async function logoutOfFacebook() {
    await apiFetch('/auth/facebook/logout', { method: 'POST' });
}
