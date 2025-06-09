// /tmp/vite_init_area/temp_pocket_money_app/src/ui/FundsManagementView.tsx
import CurrentBalanceDisplay from './funds_management_components/CurrentBalanceDisplay';
import AddFundsForm from './funds_management_components/AddFundsForm';
import RecentFundActivity from './funds_management_components/RecentFundActivity';

const FundsManagementView = () => {
  return (
    <div className="funds-management-view">
      <header className="view-header">
        <h1>Funds Management</h1>
      </header>
      <section className="current-balance-section">
        <CurrentBalanceDisplay />
      </section>
      <section className="add-funds-section">
        <AddFundsForm />
      </section>
      <section className="fund-activity-section">
        <RecentFundActivity />
      </section>
    </div>
  );
};

export default FundsManagementView;
