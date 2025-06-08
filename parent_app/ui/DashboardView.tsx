// parent_app/ui/DashboardView.tsx
import TotalFundsSummary from './dashboard_components/TotalFundsSummary';
import QuickActions from './dashboard_components/QuickActions';
import RecentActivityFeed from './dashboard_components/RecentActivityFeed';

// Define a simple functional component
const DashboardView = () => {
  return (
    <div className="dashboard-view">
      <header className="dashboard-header">
        <h1>Parent Dashboard</h1>
      </header>
      <section className="dashboard-summary">
        <TotalFundsSummary />
      </section>
      <section className="dashboard-quick-actions">
        <QuickActions />
      </section>
      <section className="dashboard-activity-feed">
        <RecentActivityFeed />
      </section>
    </div>
  );
};

export default DashboardView;
