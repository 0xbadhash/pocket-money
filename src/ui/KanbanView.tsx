/**
 * @file KanbanView.tsx
 * Main view for displaying and interacting with Kanban boards for kids' chores.
 * Allows users to select a kid to view their specific chore Kanban board.
 */
import React, { useState, useContext, useMemo } from 'react';
import { UserContext } from '../contexts/UserContext';
import { useChoresContext } from '../contexts/ChoresContext'; // Import useChoresContext
import type { Kid, ChoreInstance, ChoreDefinition } from '../types'; // Import ChoreInstance, ChoreDefinition
import KidKanbanBoard from './kanban_components/KidKanbanBoard';
import KanbanFilters from './kanban_components/KanbanFilters'; // Import KanbanFilters

/**
 * KanbanView component.
 * Renders a kid selection dropdown and the Kanban board for the selected kid.
 * It relies on UserContext to get the list of kids.
 * @returns {JSX.Element} The KanbanView UI.
 */
const KanbanView: React.FC = () => {
  const userContext = useContext(UserContext);
  const { choreInstances, choreDefinitions } = useChoresContext(); // Get all instances and definitions
  const kids = userContext?.user?.kids || [];
  const [selectedKidId, setSelectedKidId] = useState<string | null>(null);

  const [filters, setFilters] = useState<{
    tags: string[];
    rewardStatus: 'any' | 'rewarded' | 'not_rewarded';
  }>({
    tags: [],
    rewardStatus: 'any',
  });

  const [sortCriteria, setSortCriteria] = useState<{
    field: string; // 'instanceDate', 'title', 'rewardAmount'
    direction: 'asc' | 'desc';
  }>({
    field: 'instanceDate', // Default sort
    direction: 'asc',
  });

  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    choreDefinitions.forEach(def => {
      def.tags?.forEach(tag => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [choreDefinitions]);

  const handleFilterChange = (filterName: 'tags' | 'rewardStatus', value: any) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value,
    }));
  };

  const handleSortChange = (field: string, direction: 'asc' | 'desc') => {
    setSortCriteria({ field, direction });
  };

  const processedInstances = useMemo(() => {
    let instancesToProcess = [...choreInstances];

    // Filtering
    if (filters.tags.length > 0) {
      instancesToProcess = instancesToProcess.filter(instance => {
        const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
        return definition?.tags?.some(tag => filters.tags.includes(tag));
      });
    }

    if (filters.rewardStatus !== 'any') {
      instancesToProcess = instancesToProcess.filter(instance => {
        const definition = choreDefinitions.find(def => def.id === instance.choreDefinitionId);
        const hasReward = (definition?.rewardAmount ?? 0) > 0;
        return filters.rewardStatus === 'rewarded' ? hasReward : !hasReward;
      });
    }

    // Sorting
    instancesToProcess.sort((a, b) => {
      const defA = choreDefinitions.find(def => def.id === a.choreDefinitionId);
      const defB = choreDefinitions.find(def => def.id === b.choreDefinitionId);

      let valA: any;
      let valB: any;

      switch (sortCriteria.field) {
        case 'title':
          valA = defA?.title?.toLowerCase() || '';
          valB = defB?.title?.toLowerCase() || '';
          break;
        case 'rewardAmount':
          valA = defA?.rewardAmount ?? 0;
          valB = defB?.rewardAmount ?? 0;
          break;
        case 'instanceDate':
        default:
          // Ensure consistent date comparison, handling potential undefined dates
          valA = a.instanceDate ? new Date(a.instanceDate).getTime() : 0;
          valB = b.instanceDate ? new Date(b.instanceDate).getTime() : 0;
          break;
      }

      // Handle cases where values might be undefined or not comparable directly
      if (valA === undefined || valA === null) valA = sortCriteria.direction === 'asc' ? Infinity : -Infinity;
      if (valB === undefined || valB === null) valB = sortCriteria.direction === 'asc' ? Infinity : -Infinity;


      if (valA < valB) return sortCriteria.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortCriteria.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return instancesToProcess;
  }, [choreInstances, choreDefinitions, filters, sortCriteria]);


  if (userContext?.loading) {
    return <p>Loading user data...</p>;
  }

  const handleKidSelection = (kidId: string) => {
    setSelectedKidId(kidId);
  };

  return (
    <div className="kanban-view" style={{ padding: '16px' }}>
      <header className="view-header">
        <h1>Chore Kanban Board</h1>
      </header>

      <KanbanFilters
        allTags={allTags}
        currentFilters={filters}
        onFilterChange={handleFilterChange}
        currentSort={sortCriteria}
        onSortChange={handleSortChange}
      />

      <section className="kid-selection" style={{ marginTop: '20px', marginBottom: '20px' }}>
        <h2>Select Kid</h2>
        {kids.length > 0 ? (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {kids.map((kid: Kid) => (
              <button
                key={kid.id}
                onClick={() => handleKidSelection(kid.id)}
                style={{
                  fontWeight: selectedKidId === kid.id ? 'bold' : 'normal',
                  background: selectedKidId === kid.id ? 'var(--primary-color, #1976d2)' : 'var(--surface-color-hover, #f5f5f5)',
                  color: selectedKidId === kid.id ? 'var(--button-text-color, #fff)' : 'var(--text-color-primary, #333)',
                  border: '1px solid var(--border-color, #ccc)',
                  borderRadius: 'var(--border-radius-md, 4px)',
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
                aria-pressed={selectedKidId === kid.id}
              >
                {kid.name}
              </button>
            ))}
          </div>
        ) : (
          <p>No kids found. Please add kids in settings.</p>
        )}
      </section>

      {selectedKidId ? (
        <KidKanbanBoard
          kidId={selectedKidId}
          // Pass the globally filtered/sorted instances and all definitions
          // KidKanbanBoard will be responsible for further filtering by kidId and period.
          // This assumes KidKanbanBoard will be refactored to accept these props.
          // For this step, we are passing them. The refactor of KidKanbanBoard is next.
          allChoreDefinitions={choreDefinitions} // Pass all definitions
          filteredSortedInstances={processedInstances} // Pass the filtered and sorted list
        />
      ) : (
        kids.length > 0 && <p>Select a kid to view their Kanban board.</p>
      )}
      {/* Displaying filtered/sorted counts for verification during development */}
      {/* <div style={{marginTop: '20px', fontSize: '0.9em', color: '#777'}}>
        <p>Total instances from context: {choreInstances.length}</p>
        <p>Processed (filtered & sorted) instances: {processedInstances.length}</p>
        <p>Current Filters: Tags: {filters.tags.join(', ') || 'None'}, Reward: {filters.rewardStatus}</p>
        <p>Current Sort: Field: {sortCriteria.field}, Dir: {sortCriteria.direction}</p>
      </div> */}
    </div>
  );
};

export default KanbanView;
