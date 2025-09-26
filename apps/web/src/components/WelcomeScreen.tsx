import type { FC } from 'react';

type WelcomeScreenProps = {
  onBegin: () => void;
};

const WelcomeScreen: FC<WelcomeScreenProps> = ({ onBegin }) => {
  return (
    <div className="welcome-gate">
      <div className="welcome-panel">
        <div className="welcome-header">
          <span className="logo-mark">FA</span>
          <h1>Welcome to Facebook Auction Tracker</h1>
        </div>
        <p>
          We will guide you through a quick setup so the workspace can tailor alerts, currency, and time zone to your
          business. Connect Facebook when prompted and we will take care of the heavy lifting.
        </p>
        <button type="button" className="primary-action" onClick={onBegin}>
          Enter setup
        </button>
        <p className="helper-text">You can revisit onboarding any time from Settings.</p>
      </div>
    </div>
  );
};

export default WelcomeScreen;
