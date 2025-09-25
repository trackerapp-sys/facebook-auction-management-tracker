import { useState } from 'react';
import type { FacebookAuthState, FacebookGroup } from '../state';
import { fetchUserGroups, loginWithFacebook } from '../services';

type LoginScreenProps = {
  onAuthenticated: (auth: FacebookAuthState, groups: FacebookGroup[]) => void;
  error?: string | null;
};

const LoginScreen = ({ onAuthenticated, error }: LoginScreenProps) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const authState = await loginWithFacebook();
      if (!authState.isAuthenticated) {
        throw new Error('Facebook login did not complete. Please try again.');
      }

      const groups = await fetchUserGroups();
      onAuthenticated(authState, groups);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login with Facebook.';
      setLoginError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="auth-gate">
      <div className="auth-panel">
        <div className="auth-logo">FM</div>
        <h1>Connect your Facebook account</h1>
        <p className="helper-text">
          Link Facebook to sync your groups, monitor bids, and manage auctions in one place.
        </p>
        {error && <div className="error-banner">{error}</div>}
        {loginError && <div className="error-banner">{loginError}</div>}
        <button type="button" className="facebook-button" onClick={handleLogin} disabled={isLoggingIn}>
          <svg viewBox="0 0 24 24" fill="currentColor" role="img" aria-hidden>
            <path d="M13.5 22V12.75H16.5L17 9H13.5V7C13.5 5.97 13.75 5.25 15.23 5.25H17V2.14C16.12 2.04 15.23 2 14.35 2C11.64 2 9.75 3.66 9.75 6.7V9H7V12.75H9.75V22H13.5Z" />
          </svg>
          {isLoggingIn ? 'Connecting...' : 'Login with Facebook'}
        </button>
        <p className="auth-disclaimer">
          We never post without your permission. You can revoke access anytime from Facebook settings.
        </p>
      </div>
    </div>
  );
};

export default LoginScreen;