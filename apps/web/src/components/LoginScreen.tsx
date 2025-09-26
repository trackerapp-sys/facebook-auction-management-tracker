type LoginScreenProps = {
  message?: string;
  error?: string | null;
};

const LoginScreen = ({ message, error }: LoginScreenProps) => {
  return (
    <div className="auth-gate">
      <div className="auth-panel">
        <div className="auth-logo">AT</div>
        <h1>Auction Tracker</h1>
        <p className="helper-text">
          {message ?? 'Your workspace is ready. Use the onboarding wizard to configure your business details.'}
        </p>
        {error && <div className="error-banner">{error}</div>}
      </div>
    </div>
  );
};

export default LoginScreen;
