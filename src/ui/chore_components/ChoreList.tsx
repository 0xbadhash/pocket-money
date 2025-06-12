// src/ui/chore_components/ChoreList.tsx
import React, { useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext'; // To get kid names
import type { ChoreDefinition, Kid } from '../../types'; // Import ChoreDefinition and Kid types

interface ChoreListProps {
  choresToDisplay: ChoreDefinition[]; // Receives chores to display as a prop
}

const ChoreList: React.FC<ChoreListProps> = ({ choresToDisplay }) => {
  const { toggleChoreDefinitionActiveState } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const getKidName = (kidId: string | undefined): string => {
    if (!kidId) return 'Unassigned';
    const kid = kids.find((k: Kid) => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  const formatRecurrenceInfo = (chore: ChoreDefinition): string | null => {
    if (!chore.recurrenceType || chore.recurrenceType === 'none' || chore.recurrenceType === null) {
      return null;
    }
    let info = `Repeats ${chore.recurrenceType}`;
    if (chore.recurrenceType === 'weekly' && chore.recurrenceDay !== null && chore.recurrenceDay !== undefined) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      info += ` on ${days[chore.recurrenceDay]}`;
    } else if (chore.recurrenceType === 'monthly' && chore.recurrenceDay) {
      info += ` on day ${chore.recurrenceDay}`;
    }
    if (chore.recurrenceEndDate) {
      info += ` until ${chore.recurrenceEndDate}`;
    }
    return info;
  };

  if (userContext?.loading) {
    return <p>Loading kid data for chore list...</p>;
  }

  if (choresToDisplay.length === 0) {
    return <p>No chores to display. Add some chores!</p>;
  }

  return (
    <div className="chore-list">
      {choresToDisplay.map((chore) => {
        const recurrenceInfo = formatRecurrenceInfo(chore); // Get formatted recurrence string
        return (
          <div key={chore.id} className={`chore-item ${chore.isComplete ? 'complete' : ''}`}>
            <h3>{chore.title}</h3>
            {chore.description && <p className="chore-description">Description: {chore.description}</p>}
            <p>Assigned to: {getKidName(chore.assignedKidId)}</p>
            {/* Display Due Date - consider its meaning for recurring chores */}
            {chore.dueDate && <p>Due Date / Starts On: {chore.dueDate}</p>}
            {chore.rewardAmount && <p>Reward: ${chore.rewardAmount.toFixed(2)}</p>}

            {/* Display Recurrence Info */}
            {recurrenceInfo && <p style={{ fontStyle: 'italic', color: 'var(--text-color-secondary)' }}>{recurrenceInfo}</p>}

            {/* For ChoreDefinition, isComplete signifies an "archived" or "inactive" state.
                If true, new instances won't be generated. If false, it's "active". */}
            <p>Status: {chore.isComplete ? 'Archived/Inactive' : 'Active'}</p>
            <button onClick={() => toggleChoreDefinitionActiveState(chore.id)}>
              {chore.isComplete ? 'Mark as Active' : 'Mark as Archived/Inactive'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ChoreList;
