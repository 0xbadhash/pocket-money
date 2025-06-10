// /tmp/vite_init_area/temp_pocket_money_app/src/ui/DashboardView.tsx
import React, { useState } from 'react';
// import TotalFundsSummary from './dashboard_components/TotalFundsSummary';
// import QuickActions from './dashboard_components/QuickActions';
// import RecentActivityFeed from './dashboard_components/RecentActivityFeed';
import { AddChoreForm } from '../components/AddChoreForm'; // Adjust path if necessary
import { EditChoreForm } from '../components/EditChoreForm'; // Adjust path if necessary
import { useChores } from '../contexts/ChoresContext';   // Adjust path if necessary
import { Chore, RecurrenceSetting } from '../types';      // Adjust path if necessary

// Helper to format recurrence for display (optional, can be simpler)
const formatRecurrence = (recurrence: RecurrenceSetting): string => {
  if (!recurrence) return 'One-time';
  switch (recurrence.type) {
    case 'daily': return 'Daily';
    case 'weekly': return `Weekly (Day ${recurrence.dayOfWeek})`;
    case 'monthly': return `Monthly (Day ${recurrence.dayOfMonth})`;
    case 'specificDays': return `Specific Days (${recurrence.days.join(', ')})`;
    default: return 'Recurring';
  }
};

const DashboardView: React.FC = () => {
  const { chores, toggleChore, deleteChore } = useChores();
  const [editingChore, setEditingChore] = useState<Chore | null>(null);

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      deleteChore(id);
    }
  };

  return (
    // <div className="dashboard-view"> // Assuming top-level div is desired
    <div>
      {/* <header className="dashboard-header">
        <h1>Parent Dashboard</h1>
      </header> */}
      {/* <section className="dashboard-summary">
        <TotalFundsSummary />
      </section>
      <section className="dashboard-quick-actions">
        <QuickActions />
      </section> */}
      <h2>Dashboard</h2> {/* Simplified for focus */}

      {editingChore && (
        <div style={{ position: 'fixed', top: '0', left: '0', right: '0', bottom: '0', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ padding: '20px', background: 'white', borderRadius: '5px', minWidth: '300px', maxWidth: '500px' }}>
            <EditChoreForm choreToEdit={editingChore} onClose={() => setEditingChore(null)} />
          </div>
        </div>
      )}

      <h3>Add New Chore</h3>
      <AddChoreForm />

      <hr style={{ margin: '20px 0' }}/>
      <h3>Chore List</h3>
      {chores.length === 0 ? (
        <p>No chores yet. Add some!</p>
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {chores.map(chore => (
            <li key={chore.id} style={{ marginBottom: '15px', padding: '15px', border: '1px solid #eee', borderRadius: '5px', backgroundColor: chore.isComplete ? '#e6ffe6' : '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h4 style={{ margin: '0', flexGrow: 1 }}>{chore.name}</h4>
                <input
                  type="checkbox"
                  checked={chore.isComplete}
                  onChange={() => toggleChore(chore.id)}
                  style={{ marginLeft: '20px', transform: 'scale(1.3)' }}
                />
              </div>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.9em', color: '#555' }}>{chore.description}</p>
              <p style={{ margin: '0 0 5px 0', fontSize: '0.8em', color: '#777' }}>
                Due: {new Date(chore.dueDate + 'T00:00:00').toLocaleDateString()} {/* Ensure local date interpretation */}
              </p>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.8em', color: '#777' }}>
                Recurrence: {formatRecurrence(chore.recurrence)}
              </p>
              <div>
                <button onClick={() => handleEdit(chore)} style={{ marginRight: '10px', padding: '5px 10px', fontSize: '0.9em' }}>Edit</button>
                <button onClick={() => handleDelete(chore.id)} style={{ padding: '5px 10px', fontSize: '0.9em', backgroundColor: '#dc3545', color: 'white', border: 'none' }}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* <section className="dashboard-activity-feed">
        <RecentActivityFeed />
      </section> */}
    </div>
  );
};

export default DashboardView;
