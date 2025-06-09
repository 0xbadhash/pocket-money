// /tmp/vite_init_area/temp_pocket_money_app/src/ui/DashboardView.tsx
import TotalFundsSummary from './dashboard_components/TotalFundsSummary';
import QuickActions from './dashboard_components/QuickActions';
import RecentActivityFeed from './dashboard_components/RecentActivityFeed';
import { AddChoreForm } from '../components/AddChoreForm'; // Adjust path as necessary
import { useChores } from '../contexts/ChoresContext'; // Adjust path as necessary

const DashboardView: React.FC = () => {
  const { chores, toggleChore } = useChores();

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

      <hr />
      <h3>Add New Chore</h3>
      <AddChoreForm />

      <hr />
      <h3>Chore List</h3>
      {chores.length === 0 ? (
        <p>No chores yet. Add some!</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {chores.map(chore => (
            <li key={chore.id} style={{ marginBottom: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '4px', backgroundColor: chore.isComplete ? '#e6ffe6' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h4 style={{ margin: '0 0 5px 0' }}>{chore.name} {chore.recurrence && `(${chore.recurrence})`}</h4>
                  <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>{chore.description}</p>
                </div>
                <input
                  type="checkbox"
                  checked={chore.isComplete}
                  onChange={() => toggleChore(chore.id)}
                  style={{ marginLeft: '20px', transform: 'scale(1.5)' }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="dashboard-activity-feed">
        <RecentActivityFeed />
      </section>
    </div>
  );
};

export default DashboardView;
