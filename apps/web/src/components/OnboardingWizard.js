import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { useAppState } from '../state';
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
const stepBadges = ['info', 'success', 'warning', 'success'];
const defaultProfile = {
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
    const [step, setStep] = useState(0);
    const [profileDraft, setProfileDraft] = useState(defaultProfile);
    const [newInventoryItem, setNewInventoryItem] = useState({
        name: '',
        description: '',
        reservePrice: 0,
        startingPrice: 0,
        quantity: 1
    });
    const [newPaymentMethod, setNewPaymentMethod] = useState({
        label: '',
        details: '',
        isPreferred: false
    });
    const completion = useMemo(() => ((step + 1) / stepTitles.length) * 100, [step]);
    const handleProfileSubmit = (event) => {
        event.preventDefault();
        if (!profileDraft.displayName.trim()) {
            return;
        }
        setStep((prev) => (prev < 3 ? (prev + 1) : prev));
    };
    const handleAddInventoryItem = () => {
        if (!newInventoryItem.name.trim()) {
            return;
        }
        const item = {
            ...newInventoryItem,
            id: `inv-${Date.now()}`
        };
        setProfileDraft((prev) => ({ ...prev, inventory: [...prev.inventory, item] }));
        setNewInventoryItem({ name: '', description: '', reservePrice: 0, startingPrice: 0, quantity: 1 });
    };
    const handleRemoveInventoryItem = (id) => {
        setProfileDraft((prev) => ({
            ...prev,
            inventory: prev.inventory.filter((item) => item.id !== id)
        }));
    };
    const handleAddPaymentMethod = () => {
        if (!newPaymentMethod.label.trim()) {
            return;
        }
        const method = {
            ...newPaymentMethod,
            id: `pm-${Date.now()}`
        };
        setProfileDraft((prev) => ({
            ...prev,
            paymentMethods: [...prev.paymentMethods, method]
        }));
        setNewPaymentMethod({ label: '', details: '', isPreferred: false });
    };
    const handleRemovePaymentMethod = (id) => {
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
                return (_jsxs("form", { onSubmit: handleProfileSubmit, className: "form-grid", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "displayName", children: "Display name" }), _jsx("input", { id: "displayName", value: profileDraft.displayName, placeholder: "e.g. Boutique Finds Co.", onChange: (event) => setProfileDraft((prev) => ({ ...prev, displayName: event.target.value })), required: true })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", children: "Account type" }), _jsxs("div", { className: "tab-switcher", children: [_jsx("button", { type: "button", className: profileDraft.businessType === 'individual' ? 'active' : '', onClick: () => setProfileDraft((prev) => ({ ...prev, businessType: 'individual' })), children: "Individual seller" }), _jsx("button", { type: "button", className: profileDraft.businessType === 'business' ? 'active' : '', onClick: () => setProfileDraft((prev) => ({ ...prev, businessType: 'business' })), children: "Business brand" })] }), _jsx("p", { className: "helper-text", children: "We use this to tailor invoicing and tax templates." })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "timeZone", children: "Time zone" }), _jsx("select", { id: "timeZone", value: profileDraft.timeZone, onChange: (event) => setProfileDraft((prev) => ({ ...prev, timeZone: event.target.value })), children: timeZones.map((zone) => (_jsx("option", { value: zone, children: zone }, zone))) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "currency", children: "Currency" }), _jsx("select", { id: "currency", value: profileDraft.currency, onChange: (event) => setProfileDraft((prev) => ({ ...prev, currency: event.target.value })), children: currencies.map((currency) => (_jsx("option", { value: currency, children: currency }, currency))) })] })] }), _jsx("div", { className: "action-bar", children: _jsx("button", { className: "primary-action", type: "submit", children: "Continue" }) })] }));
            case 1:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "bidInterval", children: "Bid monitoring interval (minutes)" }), _jsx("input", { id: "bidInterval", type: "number", min: 1, value: profileDraft.bidMonitoringInterval, onChange: (event) => setProfileDraft((prev) => ({
                                        ...prev,
                                        bidMonitoringInterval: Number(event.target.value)
                                    })) }), _jsx("p", { className: "helper-text", children: "Controls how frequently the system checks Facebook comments for fresh bids." })] }), _jsxs("div", { className: "timeline", children: [_jsxs("div", { className: "timeline-item", children: [_jsx("strong", { children: "Live auction cadence" }), _jsx("p", { className: "helper-text", children: "Configure item intervals later in the live auction workspace. We recommend 3-5 minutes per item." }), _jsx("span", { className: "badge info", children: "Adjustable per auction" })] }), _jsxs("div", { className: "timeline-item", children: [_jsx("strong", { children: "Notifications" }), _jsx("p", { className: "helper-text", children: "Set up bidder reminders, payment nudges, and post-auction follow-ups in settings." }), _jsx("span", { className: "badge warning", children: "Coming soon" })] })] }), _jsxs("div", { className: "action-bar", children: [_jsx("button", { className: "secondary-action", type: "button", onClick: () => setStep(0), children: "Back" }), _jsx("button", { className: "primary-action", type: "button", onClick: () => setStep(2), children: "Continue" })] })] }));
            case 2:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemName", children: "Item name" }), _jsx("input", { id: "itemName", value: newInventoryItem.name, onChange: (event) => setNewInventoryItem((prev) => ({ ...prev, name: event.target.value })), placeholder: "e.g. Vintage Coach Bag" })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemQty", children: "Quantity" }), _jsx("input", { id: "itemQty", type: "number", min: 1, value: newInventoryItem.quantity, onChange: (event) => setNewInventoryItem((prev) => ({ ...prev, quantity: Number(event.target.value) })) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "itemDescription", children: "Description" }), _jsx("textarea", { id: "itemDescription", rows: 3, value: newInventoryItem.description, onChange: (event) => setNewInventoryItem((prev) => ({ ...prev, description: event.target.value })), placeholder: "Highlight condition, sizing, and any bundle details." })] }), _jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "reservePrice", children: "Reserve price" }), _jsx("input", { id: "reservePrice", type: "number", min: 0, value: newInventoryItem.reservePrice, onChange: (event) => setNewInventoryItem((prev) => ({ ...prev, reservePrice: Number(event.target.value) })) })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "startingPrice", children: "Starting price" }), _jsx("input", { id: "startingPrice", type: "number", min: 0, value: newInventoryItem.startingPrice, onChange: (event) => setNewInventoryItem((prev) => ({ ...prev, startingPrice: Number(event.target.value) })) }), _jsx("p", { className: "helper-text", children: "Reserve is the minimum you will accept. Starting price can be lower to drive engagement." })] })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => setStep(1), children: "Back" }), _jsx("button", { type: "button", className: "primary-action", onClick: handleAddInventoryItem, children: "Add to inventory" })] }), _jsxs("div", { className: "list-box", children: [_jsx("p", { className: "field-label", children: "Current inventory" }), profileDraft.inventory.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No items yet" }), _jsx("p", { children: "Add at least one item so you can launch your first auction with confidence." })] })) : (profileDraft.inventory.map((item) => (_jsxs("div", { className: "list-box-item", children: [_jsxs("div", { children: [_jsx("strong", { children: item.name }), _jsxs("p", { className: "helper-text", children: ["Reserve ", profileDraft.currency, " ", item.reservePrice.toFixed(2), " \u00B7 Starting", ' ', profileDraft.currency, " ", item.startingPrice.toFixed(2), " \u00B7 Qty ", item.quantity] })] }), _jsx("button", { type: "button", className: "subtle-button", onClick: () => handleRemoveInventoryItem(item.id), children: "Remove" })] }, item.id))))] }), _jsxs("div", { className: "action-bar", children: [_jsx("button", { className: "secondary-action", type: "button", onClick: () => setStep(1), children: "Back" }), _jsx("button", { className: "primary-action", type: "button", onClick: () => setStep(3), children: "Continue" })] })] }));
            case 3:
                return (_jsxs("div", { className: "form-grid", children: [_jsxs("div", { className: "form-grid two-columns", children: [_jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "pmLabel", children: "Payment method label" }), _jsx("input", { id: "pmLabel", value: newPaymentMethod.label, onChange: (event) => setNewPaymentMethod((prev) => ({ ...prev, label: event.target.value })), placeholder: "e.g. Stripe Invoice, PayPal, Direct Transfer" })] }), _jsxs("div", { className: "inline-stack", children: [_jsx("label", { className: "field-label", htmlFor: "pmPreferred", children: "Preferred method" }), _jsxs("div", { className: "flex-row", children: [_jsx("input", { id: "pmPreferred", type: "checkbox", checked: newPaymentMethod.isPreferred, onChange: (event) => setNewPaymentMethod((prev) => ({ ...prev, isPreferred: event.target.checked })) }), _jsx("span", { className: "helper-text", children: "Mark as the default option in invoices." })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "field-label", htmlFor: "pmDetails", children: "Instructions / details" }), _jsx("textarea", { id: "pmDetails", rows: 3, value: newPaymentMethod.details, onChange: (event) => setNewPaymentMethod((prev) => ({ ...prev, details: event.target.value })), placeholder: "Provide payout instructions or payment link template." })] }), _jsxs("div", { className: "inline-actions", children: [_jsx("button", { type: "button", className: "ghost-button", onClick: () => setStep(2), children: "Back" }), _jsx("button", { type: "button", className: "primary-action", onClick: handleAddPaymentMethod, children: "Add payment method" })] }), _jsxs("div", { className: "list-box", children: [_jsx("p", { className: "field-label", children: "Saved payment methods" }), profileDraft.paymentMethods.length === 0 ? (_jsxs("div", { className: "empty-state", children: [_jsx("h3", { children: "No payment methods configured" }), _jsx("p", { children: "Set at least one payment method for quick bidder checkout." })] })) : (profileDraft.paymentMethods.map((method) => (_jsxs("div", { className: "list-box-item", children: [_jsxs("div", { children: [_jsx("strong", { children: method.label }), _jsx("p", { className: "helper-text", children: method.details || 'Instructions will appear on invoices.' }), method.isPreferred && _jsx("span", { className: "badge success", children: "Preferred" })] }), _jsx("button", { type: "button", className: "subtle-button", onClick: () => handleRemovePaymentMethod(method.id), children: "Remove" })] }, method.id))))] }), _jsx("div", { className: "success-banner", children: "Finish setup to unlock the auction control center and Facebook integrations." }), _jsxs("div", { className: "action-bar", children: [_jsx("button", { className: "secondary-action", type: "button", onClick: () => setStep(2), children: "Back" }), _jsx("button", { className: "primary-action", type: "button", onClick: handleComplete, children: "Launch dashboard" })] })] }));
            default:
                return null;
        }
    };
    return (_jsxs("div", { className: "onboarding-layout", children: [_jsxs("aside", { className: "onboarding-sidebar", children: [_jsxs("div", { className: "onboarding-brand", children: [_jsx("span", { className: "logo-mark", children: "FA" }), _jsxs("div", { children: [_jsx("strong", { children: "Auction Studio" }), _jsx("p", { children: "Launch Playbook" })] })] }), _jsx("ol", { className: "step-list", children: stepTitles.map((title, index) => (_jsxs("li", { className: index === step ? 'active' : index < step ? 'completed' : '', children: [_jsx("span", { children: index + 1 }), _jsxs("div", { children: [_jsx("strong", { children: title }), _jsxs("small", { children: [index === 0 && 'Set your brand tone and locale setup.', index === 1 && 'Tune how often we monitor and remind bidders.', index === 2 && 'Add hero inventory ready for your first drop.', index === 3 && 'Collect payments seamlessly post-auction.'] })] })] }, title))) }), _jsxs("div", { className: "onboarding-footer", children: [_jsx("p", { children: "Need help importing inventory? Drop us a line and we will assist with CSV upload." }), _jsx("a", { className: "inline-link", href: "#support", onClick: (event) => event.preventDefault(), children: "Contact support" })] })] }), _jsxs("section", { className: "onboarding-content", children: [_jsxs("header", { children: [_jsxs("span", { className: `badge ${stepBadges[step]}`, children: ["Step ", step + 1, " of ", stepTitles.length] }), _jsx("h1", { children: stepTitles[step] }), _jsx("p", { className: "section-caption", children: "Complete this quick launch checklist to personalise your auction experience." }), _jsx("div", { className: "progress-bar", children: _jsx("span", { style: { width: `${completion}%` } }) })] }), _jsx("div", { className: "panel-card", children: renderStepContent() })] })] }));
};
export default OnboardingWizard;
