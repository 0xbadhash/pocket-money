// src/ui/chore_components/ChoreList.tsx
import React, { useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext'; // To get kid names
import type { Chore, Kid } from '../../types'; // Import Chore and Kid types

interface ChoreListProps {
  choresToDisplay: Chore[]; // Receives chores to display as a prop
}

const ChoreList: React.FC<ChoreListProps> = ({ choresToDisplay }) => {
  const { toggleChoreComplete } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const getKidName = (kidId: string | undefined): string => {
    if (!kidId) return 'Unassigned';
    const kid = kids.find((k: Kid) => k.id === kidId);
    return kid ? kid.name : 'Unknown Kid';
  };

  if (userContext?.loading) {
    return <p>Loading kid data for chore list...</p>;
  }

  if (choresToDisplay.length === 0) {
    return <p>No chores to display. Add some chores!</p>;
  }

  return (
    <div className="chore-list">
      {choresToDisplay.map((chore) => (
        <div key={chore.id} className={`chore-item ${chore.isComplete ? 'complete' : ''}`}>
          <h3>{chore.title}</h3>
          {chore.description && <p className="chore-description">Description: {chore.description}</p>}
          <p>Assigned to: {getKidName(chore.assignedKidId)}</p>
          {chore.dueDate && <p>Due Date: {chore.dueDate}</p>}
          {chore.rewardAmount && <p>Reward: ${chore.rewardAmount.toFixed(2)}</p>}
          <p>Status: {chore.isComplete ? 'Complete' : 'Incomplete'}</p>
          <button onClick={() => toggleChoreComplete(chore.id)}>
            {chore.isComplete ? 'Mark as Incomplete' : 'Mark as Complete'}
          </button>
        </div>
      ))}
    </div>
  );
};

export default ChoreList;
