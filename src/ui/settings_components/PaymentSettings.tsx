// src/ui/settings_components/PaymentSettings.tsx
import React from 'react'; // Ensure React is imported if using JSX features like fragments
import PaymentMethodsView from '../payment_methods_components/PaymentMethodsView'; // Adjust path as needed

const PaymentSettings = () => {
  return (
    <div className="settings-section">
      {/* The main heading can remain if PaymentMethodsView is considered a sub-section */}
      {/* Or PaymentMethodsView's own heading can be the primary one if this component becomes just a wrapper */}
      <h2>Payment Settings</h2>

      {/* Integrate PaymentMethodsView */}
      <PaymentMethodsView />

      {/* We can decide if the old "Default Funding Source" UI is still needed here, */}
      {/* or if that functionality will be part of PaymentMethodsView itself (e.g. "Set as Default"). */}
      {/* For now, let's comment it out to avoid redundancy if PaymentMethodsView will handle it. */}
      {/*
      <div className="settings-item" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
        <h4>Legacy Default Funding Source (Example)</h4>
        <label htmlFor="defaultSource">Default Funding Source:</label>
        <select id="defaultSource" name="defaultSource" disabled>
          <option>Bank of Example ****1234</option>
        </select>
        <p><small>Note: Default source management will be integrated into the list above.</small></p>
      </div>
      */}
    </div>
  );
};
export default PaymentSettings;
