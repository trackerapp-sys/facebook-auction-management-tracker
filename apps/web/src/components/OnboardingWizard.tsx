import { FormEvent, useMemo, useState } from 'react';
import { useAppState, UserProfile, InventoryItem, PaymentMethodConfig } from '../state';

const timeZones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney'
];

const currencies = ['USD', 'CAD', 'GBP', 'EUR', 'AUD'];

const stepTitles = ['Profile', 'Auction Preferences', 'Inventory', 'Payments'];

type WizardStep = 0 | 1 | 2 | 3;

const stepBadges: Array<'info' | 'success' | 'warning'> = ['info', 'success', 'warning', 'success'];

const defaultProfile: UserProfile = {
  displayName: '',
  businessType: 'individual',
  timeZone: timeZones[0],
  currency: currencies[0],
  bidMonitoringInterval: 5,
  inventory: [],
  paymentMethods: []
};

const OnboardingWizard = () => {
  const { dispatch } = useAppState();
  const [step, setStep] = useState<WizardStep>(0);
  const [profileDraft, setProfileDraft] = useState<UserProfile>(defaultProfile);
  const [newInventoryItem, setNewInventoryItem] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    description: '',
    reservePrice: 0,
    startingPrice: 0,
    quantity: 1
  });
  const [newPaymentMethod, setNewPaymentMethod] = useState<Omit<PaymentMethodConfig, 'id'>>({
    label: '',
    details: '',
    isPreferred: false
  });

  const completion = useMemo(() => ((step + 1) / stepTitles.length) * 100, [step]);

  const handleProfileSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!profileDraft.displayName.trim()) {
      return;
    }
    setStep((prev) => (prev < 3 ? ((prev + 1) as WizardStep) : prev));
  };

  const handleAddInventoryItem = () => {
    if (!newInventoryItem.name.trim()) {
      return;
    }

    const item: InventoryItem = {
      ...newInventoryItem,
      id: `inv-${Date.now()}`
    };

    setProfileDraft((prev) => ({ ...prev, inventory: [...prev.inventory, item] }));
    setNewInventoryItem({ name: '', description: '', reservePrice: 0, startingPrice: 0, quantity: 1 });
  };

  const handleRemoveInventoryItem = (id: string) => {
    setProfileDraft((prev) => ({
      ...prev,
      inventory: prev.inventory.filter((item) => item.id !== id)
    }));
  };

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.label.trim()) {
      return;
    }

    const method: PaymentMethodConfig = {
      ...newPaymentMethod,
      id: `pm-${Date.now()}`
    };

    setProfileDraft((prev) => ({
      ...prev,
      paymentMethods: [...prev.paymentMethods, method]
    }));
    setNewPaymentMethod({ label: '', details: '', isPreferred: false });
  };

  const handleRemovePaymentMethod = (id: string) => {
    setProfileDraft((prev) => ({
      ...prev,
      paymentMethods: prev.paymentMethods.filter((method) => method.id !== id)
    }));
  };

  const handleComplete = () => {
    if (!profileDraft.displayName.trim()) {
      return;
    }
    dispatch({ type: 'complete-onboarding', payload: profileDraft });
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <form onSubmit={handleProfileSubmit} className="form-grid">
            <div>
              <label className="field-label" htmlFor="displayName">
                Display name
              </label>
              <input
                id="displayName"
                value={profileDraft.displayName}
                placeholder="e.g. Boutique Finds Co."
                onChange={(event) =>
                  setProfileDraft((prev) => ({ ...prev, displayName: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <label className="field-label">Account type</label>
              <div className="tab-switcher">
                <button
                  type="button"
                  className={profileDraft.businessType === 'individual' ? 'active' : ''}
                  onClick={() => setProfileDraft((prev) => ({ ...prev, businessType: 'individual' }))}
                >
                  Individual seller
                </button>
                <button
                  type="button"
                  className={profileDraft.businessType === 'business' ? 'active' : ''}
                  onClick={() => setProfileDraft((prev) => ({ ...prev, businessType: 'business' }))}
                >
                  Business brand
                </button>
              </div>
              <p className="helper-text">We use this to tailor invoicing and tax templates.</p>
            </div>
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="timeZone">
                  Time zone
                </label>
                <select
                  id="timeZone"
                  value={profileDraft.timeZone}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, timeZone: event.target.value }))
                  }
                >
                  {timeZones.map((zone) => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="currency">
                  Currency
                </label>
                <select
                  id="currency"
                  value={profileDraft.currency}
                  onChange={(event) =>
                    setProfileDraft((prev) => ({ ...prev, currency: event.target.value }))
                  }
                >
                  {currencies.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="action-bar">
              <button className="primary-action" type="submit">
                Continue
              </button>
            </div>
          </form>
        );
      case 1:
        return (
          <div className="form-grid">
            <div>
              <label className="field-label" htmlFor="bidInterval">
                Bid monitoring interval (minutes)
              </label>
              <input
                id="bidInterval"
                type="number"
                min={1}
                value={profileDraft.bidMonitoringInterval}
                onChange={(event) =>
                  setProfileDraft((prev) => ({
                    ...prev,
                    bidMonitoringInterval: Number(event.target.value)
                  }))
                }
              />
              <p className="helper-text">
                Controls how frequently the system checks Facebook comments for fresh bids.
              </p>
            </div>
            <div className="timeline">
              <div className="timeline-item">
                <strong>Live auction cadence</strong>
                <p className="helper-text">
                  Configure item intervals later in the live auction workspace. We recommend 3-5 minutes per item.
                </p>
                <span className="badge info">Adjustable per auction</span>
              </div>
              <div className="timeline-item">
                <strong>Notifications</strong>
                <p className="helper-text">
                  Set up bidder reminders, payment nudges, and post-auction follow-ups in settings.
                </p>
                <span className="badge warning">Coming soon</span>
              </div>
            </div>
            <div className="action-bar">
              <button className="secondary-action" type="button" onClick={() => setStep(0)}>
                Back
              </button>
              <button className="primary-action" type="button" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="form-grid">
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="itemName">
                  Item name
                </label>
                <input
                  id="itemName"
                  value={newInventoryItem.name}
                  onChange={(event) =>
                    setNewInventoryItem((prev) => ({ ...prev, name: event.target.value }))
                  }
                  placeholder="e.g. Vintage Coach Bag"
                />
              </div>
              <div>
                <label className="field-label" htmlFor="itemQty">
                  Quantity
                </label>
                <input
                  id="itemQty"
                  type="number"
                  min={1}
                  value={newInventoryItem.quantity}
                  onChange={(event) =>
                    setNewInventoryItem((prev) => ({ ...prev, quantity: Number(event.target.value) }))
                  }
                />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="itemDescription">
                Description
              </label>
              <textarea
                id="itemDescription"
                rows={3}
                value={newInventoryItem.description}
                onChange={(event) =>
                  setNewInventoryItem((prev) => ({ ...prev, description: event.target.value }))
                }
                placeholder="Highlight condition, sizing, and any bundle details."
              />
            </div>
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="reservePrice">
                  Reserve price
                </label>
                <input
                  id="reservePrice"
                  type="number"
                  min={0}
                  value={newInventoryItem.reservePrice}
                  onChange={(event) =>
                    setNewInventoryItem((prev) => ({ ...prev, reservePrice: Number(event.target.value) }))
                  }
                />
              </div>
              <div>
                <label className="field-label" htmlFor="startingPrice">
                  Starting price
                </label>
                <input
                  id="startingPrice"
                  type="number"
                  min={0}
                  value={newInventoryItem.startingPrice}
                  onChange={(event) =>
                    setNewInventoryItem((prev) => ({ ...prev, startingPrice: Number(event.target.value) }))
                  }
                />
                <p className="helper-text">
                  Reserve is the minimum you will accept. Starting price can be lower to drive engagement.
                </p>
              </div>
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={() => setStep(1)}>
                Back
              </button>
              <button type="button" className="primary-action" onClick={handleAddInventoryItem}>
                Add to inventory
              </button>
            </div>
            <div className="list-box">
              <p className="field-label">Current inventory</p>
              {profileDraft.inventory.length === 0 ? (
                <div className="empty-state">
                  <h3>No items yet</h3>
                  <p>Add at least one item so you can launch your first auction with confidence.</p>
                </div>
              ) : (
                profileDraft.inventory.map((item) => (
                  <div key={item.id} className="list-box-item">
                    <div>
                      <strong>{item.name}</strong>
                      <p className="helper-text">
                        Reserve {profileDraft.currency} {item.reservePrice.toFixed(2)} · Starting{' '}
                        {profileDraft.currency} {item.startingPrice.toFixed(2)} · Qty {item.quantity}
                      </p>
                    </div>
                    <button type="button" className="subtle-button" onClick={() => handleRemoveInventoryItem(item.id)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="action-bar">
              <button className="secondary-action" type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="primary-action" type="button" onClick={() => setStep(3)}>
                Continue
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="form-grid">
            <div className="form-grid two-columns">
              <div>
                <label className="field-label" htmlFor="pmLabel">
                  Payment method label
                </label>
                <input
                  id="pmLabel"
                  value={newPaymentMethod.label}
                  onChange={(event) =>
                    setNewPaymentMethod((prev) => ({ ...prev, label: event.target.value }))
                  }
                  placeholder="e.g. Stripe Invoice, PayPal, Direct Transfer"
                />
              </div>
              <div className="inline-stack">
                <label className="field-label" htmlFor="pmPreferred">
                  Preferred method
                </label>
                <div className="flex-row">
                  <input
                    id="pmPreferred"
                    type="checkbox"
                    checked={newPaymentMethod.isPreferred}
                    onChange={(event) =>
                      setNewPaymentMethod((prev) => ({ ...prev, isPreferred: event.target.checked }))
                    }
                  />
                  <span className="helper-text">Mark as the default option in invoices.</span>
                </div>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="pmDetails">
                Instructions / details
              </label>
              <textarea
                id="pmDetails"
                rows={3}
                value={newPaymentMethod.details}
                onChange={(event) =>
                  setNewPaymentMethod((prev) => ({ ...prev, details: event.target.value }))
                }
                placeholder="Provide payout instructions or payment link template."
              />
            </div>
            <div className="inline-actions">
              <button type="button" className="ghost-button" onClick={() => setStep(2)}>
                Back
              </button>
              <button type="button" className="primary-action" onClick={handleAddPaymentMethod}>
                Add payment method
              </button>
            </div>
            <div className="list-box">
              <p className="field-label">Saved payment methods</p>
              {profileDraft.paymentMethods.length === 0 ? (
                <div className="empty-state">
                  <h3>No payment methods configured</h3>
                  <p>Set at least one payment method for quick bidder checkout.</p>
                </div>
              ) : (
                profileDraft.paymentMethods.map((method) => (
                  <div key={method.id} className="list-box-item">
                    <div>
                      <strong>{method.label}</strong>
                      <p className="helper-text">{method.details || 'Instructions will appear on invoices.'}</p>
                      {method.isPreferred && <span className="badge success">Preferred</span>}
                    </div>
                    <button type="button" className="subtle-button" onClick={() => handleRemovePaymentMethod(method.id)}>
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="success-banner">
              Finish setup to unlock the auction control center and Facebook integrations.
            </div>
            <div className="action-bar">
              <button className="secondary-action" type="button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="primary-action" type="button" onClick={handleComplete}>
                Launch dashboard
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="onboarding-layout">
      <aside className="onboarding-sidebar">
        <div className="onboarding-brand">
          <span className="logo-mark">FA</span>
          <div>
            <strong>Auction Studio</strong>
            <p>Launch Playbook</p>
          </div>
        </div>
        <ol className="step-list">
          {stepTitles.map((title, index) => (
            <li key={title} className={index === step ? 'active' : index < step ? 'completed' : ''}>
              <span>{index + 1}</span>
              <div>
                <strong>{title}</strong>
                <small>
                  {index === 0 && 'Set your brand tone and locale setup.'}
                  {index === 1 && 'Tune how often we monitor and remind bidders.'}
                  {index === 2 && 'Add hero inventory ready for your first drop.'}
                  {index === 3 && 'Collect payments seamlessly post-auction.'}
                </small>
              </div>
            </li>
          ))}
        </ol>
        <div className="onboarding-footer">
          <p>Need help importing inventory? Drop us a line and we will assist with CSV upload.</p>
          <a className="inline-link" href="#support" onClick={(event) => event.preventDefault()}>
            Contact support
          </a>
        </div>
      </aside>
      <section className="onboarding-content">
        <header>
          <span className={`badge ${stepBadges[step]}`}>Step {step + 1} of {stepTitles.length}</span>
          <h1>{stepTitles[step]}</h1>
          <p className="section-caption">Complete this quick launch checklist to personalise your auction experience.</p>
          <div className="progress-bar">
            <span style={{ width: `${completion}%` }} />
          </div>
        </header>
        <div className="panel-card">{renderStepContent()}</div>
      </section>
    </div>
  );
};

export default OnboardingWizard;
