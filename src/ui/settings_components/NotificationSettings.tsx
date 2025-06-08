// /tmp/vite_init_area/temp_pocket_money_app/src/ui/settings_components/NotificationSettings.tsx
const NotificationSettings = () => {
  return (
    <div className="settings-section">
      <h2>Notification Preferences</h2>
      <div className="settings-item">
        <label htmlFor="transactionAlerts">Transaction Alerts:</label>
        <input type="checkbox" id="transactionAlerts" name="transactionAlerts" disabled />
      </div>
      <div className="settings-item">
        <label htmlFor="lowBalanceWarnings">Low Balance Warnings:</label>
        <input type="checkbox" id="lowBalanceWarnings" name="lowBalanceWarnings" defaultChecked disabled />
      </div>
      <div className="settings-item">
        <label htmlFor="goalAlerts">Goal Completion Alerts:</label>
        <input type="checkbox" id="goalAlerts" name="goalAlerts" defaultChecked disabled />
      </div>
    </div>
  );
};
export default NotificationSettings;
