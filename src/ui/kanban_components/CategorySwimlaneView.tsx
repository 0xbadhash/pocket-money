// src/ui/kanban_components/CategorySwimlaneView.tsx
import React from 'react';
import { MatrixKanbanCategory } from '../../types';
// import KanbanCard from './KanbanCard'; // To be used when integrating chore instances
// import { useChoresContext } from '../../contexts/ChoresContext'; // To be used for fetching instances

interface CategorySwimlaneViewProps {
  date: Date;
  category: MatrixKanbanCategory;
}

const CategorySwimlaneView: React.FC<CategorySwimlaneViewProps> = ({ date, category }) => {
  // const { choreInstances, getDefinitionForInstance } = useChoresContext(); // getDefinitionForInstance might be from ChoresContext or passed down

  // Example: Filtering logic (will be refined when integrating actual data)
  // const relevantChores = choreInstances.filter(
  //   instance => instance.instanceDate === date.toISOString().split('T')[0] && instance.categoryStatus === category
  // );

  const categoryTitles: Record<MatrixKanbanCategory, string> = {
    TO_DO: "To Do",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed"
  };

  // Basic styling for visual distinction - can be enhanced with CSS classes
  const swimlaneStyles: Record<MatrixKanbanCategory, React.CSSProperties> = {
    TO_DO: { backgroundColor: '#ffecb3' /* Light Yellow */, borderLeft: '3px solid #ffd54f' /* Amber */ },
    IN_PROGRESS: { backgroundColor: '#bbdefb' /* Light Blue */, borderLeft: '3px solid #64b5f6' /* Blue */ },
    COMPLETED: { backgroundColor: '#c8e6c9' /* Light Green */, borderLeft: '3px solid #81c784' /* Green */ }
  };

  return (
    <div
      className={`category-swimlane-view category-${category.toLowerCase()}`}
      style={{
        border: '1px solid #e0e0e0',
        padding: '8px',
        minHeight: '120px', // Ensure swimlane has some height
        borderRadius: '4px',
        ...swimlaneStyles[category]
      }}
    >
      <h5 style={{ marginTop: '0', marginBottom: '8px', borderBottom: '1px solid #ccc', paddingBottom: '4px' }}>
        {categoryTitles[category]}
      </h5>
      <div className="cards-container" style={{ minHeight: '80px' /* Placeholder for cards */}}>
        {/* Placeholder for actual cards */}
        <p style={{fontSize: '0.8em', color: '#777', textAlign: 'center', marginTop: '20px' }}>
          {/* (Chores for {date.toLocaleDateString()} - {categoryTitles[category]}) */}
          {/* Placeholder to show if empty, will be replaced by card mapping logic */}
          No chores in this section yet.
        </p>
        {/*
        {relevantChores.map(instance => {
          const definition = getDefinitionForInstance(instance.choreDefinitionId); // Assuming getDefinitionForInstance is available
          if (!definition) return null;
          return <KanbanCard key={instance.id} instance={instance} definition={definition} />;
        })}
        */}
      </div>
    </div>
  );
};

export default CategorySwimlaneView;
