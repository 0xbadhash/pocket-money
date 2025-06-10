// src/ui/chore_components/ChoreList.tsx
import React, { useContext } from 'react';
import { useChoresContext } from '../../contexts/ChoresContext';
import { UserContext } from '../../contexts/UserContext'; // To get kid names
import type { ChoreInstance, Kid } from '../../types'; // Import ChoreInstance and Kid types

interface ChoreListProps {
  choresToDisplay: ChoreInstance[]; // Receives chore instances to display as a prop
}

const ChoreList: React.FC<ChoreListProps> = ({ choresToDisplay }) => {
  const { toggleChoreInstanceComplete } = useChoresContext();
  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const getKidName = (kidId: string | undefined): string => {
    if (!kidId) return 'Unassigned';
    const kid = kids.find((k: Kid) => k.id === kidId); // Kid type is used here
    return kid ? kid.name : 'Unknown Kid';
  };

  const formatRecurrenceInfo = (chore: ChoreInstance): string | null => {
    // Accessing properties from ChoreDefinition, need to fetch it
    const { choreDefinitions } = useChoresContext();
    const definition = choreDefinitions.find(def => def.id === chore.choreDefinitionId);

    if (!definition || !definition.recurrenceType) { // Simplified check, as 'none' is not a valid type, null covers it.
      return null;
    }
    let info = `Repeats ${definition.recurrenceType}`;
    if (definition.recurrenceType === 'weekly' && definition.recurrenceDay !== null && definition.recurrenceDay !== undefined) {
      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      info += ` on ${days[definition.recurrenceDay]}`;
    } else if (definition.recurrenceType === 'monthly' && definition.recurrenceDay) {
      info += ` on day ${definition.recurrenceDay}`;
    }
    if (definition.recurrenceEndDate) {
      info += ` until ${definition.recurrenceEndDate}`;
    }
    return info;
  };

  if (userContext?.loading) {
    return <p>Loading kid data for chore list...</p>;
  }

  if (choresToDisplay.length === 0) {
    return <p>No chores to display. Add some chores!</p>;
  }

  // Need to access choreDefinitions for title, description etc.
  const { choreDefinitions } = useChoresContext();

  return (
    <div className="chore-list">
      {choresToDisplay.map((instance) => {
        const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
        if (!definition) return <div key={instance.id}>Chore definition not found for instance {instance.id}</div>;

        const recurrenceInfo = formatRecurrenceInfo(instance); // Get formatted recurrence string
        return (
          <div key={instance.id} className={`chore-item ${instance.isComplete ? 'complete' : ''}`}>
            <h3>{definition.title}</h3>
            {definition.description && <p className="chore-description">Description: {definition.description}</p>}
            <p>Assigned to: {getKidName(definition.assignedKidId)}</p>
            <p>Date: {instance.instanceDate}</p>
            {definition.rewardAmount && <p>Reward: ${definition.rewardAmount.toFixed(2)}</p>}

            {/* Display Recurrence Info */}
            {recurrenceInfo && <p style={{ fontStyle: 'italic', color: 'var(--text-color-secondary)' }}>{recurrenceInfo}</p>}

            <p>Status: {instance.isComplete ? 'Complete' : 'Incomplete'}</p>
            <button onClick={() => toggleChoreInstanceComplete(instance.id)}>
              {instance.isComplete ? 'Mark as Incomplete' : 'Mark as Complete'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default ChoreList;

/*
Removed unused Kid import as UserContext already defines kids with Kid[] type implicitly.
Changed Chore to ChoreInstance.
Modified formatRecurrenceInfo to fetch definition from context.
Modified main map function to use 'instance' and fetch 'definition' to display properties.
ChoreInstance itself doesn't have title, description, assignedKidId, rewardAmount, recurrence info.
These are on ChoreDefinition.
The `dueDate` on ChoreDefinition is the start date for recurring, or due date for one-off.
The `instanceDate` on ChoreInstance is the actual date for that specific instance.
*/
