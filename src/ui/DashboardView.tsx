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
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortCriteria, setSortCriteria] = useState<string>("dueDate_desc"); // Default sort

  const handleEdit = (chore: Chore) => {
    setEditingChore(chore);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this chore?')) {
      deleteChore(id);
    }
  };

  // NEW Filtering Logic
  let processedChores = chores; // Start with all chores

  if (filterStatus === 'completed') {
    processedChores = processedChores.filter(chore => chore.isComplete);
  } else if (filterStatus === 'incomplete') {
    processedChores = processedChores.filter(chore => !chore.isComplete);
  }
  // If filterStatus is 'all', no filtering is done on status.

  // NEW Sorting Logic
  let choresToDisplay = [...processedChores]; // Create a mutable copy for sorting

  switch (sortCriteria) {
    case 'dueDate_desc':
      choresToDisplay.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      break;
    case 'dueDate_asc':
      choresToDisplay.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      break;
    case 'name_asc':
      choresToDisplay.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name_desc':
      choresToDisplay.sort((a, b) => b.name.localeCompare(a.name));
      break;
    default:
      // No sorting or default sort if needed
      break;
  }

  // NEW Upcoming/Due Today Summary Logic
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const fourDaysFromTodayStart = new Date(todayStart);
  fourDaysFromTodayStart.setDate(todayStart.getDate() + 4);

  let dueTodayCount = 0;
  let dueNext3DaysCount = 0;

  // Iterate over the original 'chores' from context for this summary
  chores.forEach(chore => {
    if (!chore.isComplete) {
      const choreDueDate = new Date(chore.dueDate + 'T00:00:00'); // Parse chore's due date as local

      // Check for due today
      if (choreDueDate.getTime() === todayStart.getTime()) {
        dueTodayCount++;
      }
      // Check for due in the next 3 days (tomorrow, day after, day after that)
      else if (choreDueDate >= tomorrowStart && choreDueDate < fourDaysFromTodayStart) {
        dueNext3DaysCount++;
      }
    }
  });

  return (
    // <div className="dashboard-view"> // Assuming top-level div is desired
    <div>
      {/* <header className="dashboard-header">
        <h1>Parent Dashboard</h1>
      </header> */}

      {/* NEW Upcoming Chores Summary Section */}
      <div style={{ padding: '10px 15px', marginBottom: '20px', background: '#f0f8ff', border: '1px solid #cce5ff', borderRadius: '5px' }}>
        <h3 style={{ marginTop: 0, marginBottom: '10px', color: '#004085' }}>Chores Summary</h3>
        <p style={{ margin: '5px 0' }}>Chores Due Today: <strong>{dueTodayCount}</strong></p>
        <p style={{ margin: '5px 0' }}>Chores Due in Next 3 Days (excluding today): <strong>{dueNext3DaysCount}</strong></p>
      </div>

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

      {/* NEW Filter and Sort Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px', gap: '20px' }}>
        <div>
          <label htmlFor="filterStatus" style={{ marginRight: '5px' }}>Filter by status:</label>
          <select
            id="filterStatus"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '5px' }}
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="incomplete">Incomplete</option>
          </select>
        </div>
        <div>
          <label htmlFor="sortCriteria" style={{ marginRight: '5px' }}>Sort by:</label>
          <select
            id="sortCriteria"
            value={sortCriteria}
            onChange={(e) => setSortCriteria(e.target.value)}
            style={{ padding: '5px' }}
          >
            <option value="dueDate_desc">Due Date (Newest First)</option>
            <option value="dueDate_asc">Due Date (Oldest First)</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      {choresToDisplay.length === 0 ? ( // Use choresToDisplay
        <p>No chores match the current filters.</p> // Message can be more dynamic
      ) : (
        <ul style={{ listStyleType: 'none', padding: 0 }}>
          {choresToDisplay.map(chore => {
            // NEW Overdue Check Logic
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize today to the beginning of the day for accurate comparison
            const dueDate = new Date(chore.dueDate + 'T00:00:00'); // Ensure dueDate is parsed as local
            const isOverdue = !chore.isComplete && dueDate < today;

            // Base style for all items (from previous steps)
            let itemStyle: React.CSSProperties = {
              marginBottom: '15px',
              padding: '15px',
              border: '1px solid #eee',
              borderRadius: '5px',
              backgroundColor: chore.isComplete ? '#e6ffe6' : '#fff'
            };

            if (isOverdue) {
              itemStyle = {
                ...itemStyle,
                backgroundColor: '#ffdddd', // Light red background for overdue
                borderColor: '#ffaaaa',   // Darker red border
              };
            }

            return (
              <li key={chore.id} style={itemStyle}>
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
            );
          })}
        </ul>
      )}

      {/* <section className="dashboard-activity-feed">
        <RecentActivityFeed />
      </section> */}
    </div>
  );
};

export default DashboardView;
