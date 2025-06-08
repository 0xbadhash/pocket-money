// parent_app/ui/settings_components/PaymentSettings.tsx
const PaymentSettings = () => {
  return (
    <div className="settings-section">
      <h2>Payment & Linked Accounts</h2>
      <div className="settings-item">
        <p>Linked Account: Bank of Example ****1234</p>
        <button disabled>Manage Linked Accounts (via Google Pay)</button>
      </div>
      <div className="settings-item">
        <label htmlFor="defaultSource">Default Funding Source:</label>
        <select id="defaultSource" name="defaultSource" disabled>
          <option>Bank of Example ****1234</option>
        </select>
      </div>
    </div>
  );
};
export default PaymentSettings;
