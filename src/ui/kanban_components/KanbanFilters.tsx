import React, { useState, useMemo } from 'react';
import type { ChoreDefinition } from '../../types'; // Assuming ChoreDefinition might be useful for tag sources

// Define types for props right in the file for now
export interface KanbanFiltersProps {
  allTags: string[];
  currentFilters: {
    tags: string[]; // Array of selected tag strings
    rewardStatus: 'any' | 'rewarded' | 'not_rewarded';
  };
  onFilterChange: (filterName: 'tags' | 'rewardStatus', value: any) => void;
  currentSort: {
    field: string; // e.g., 'dueDate', 'title', 'rewardAmount'
    direction: 'asc' | 'desc';
  };
  onSortChange: (field: string, direction: 'asc' | 'desc') => void;
}

const containerStyle: React.CSSProperties = {
  padding: '1rem',
  margin: '1rem 0',
  backgroundColor: 'var(--surface-color-secondary, #f8f9fa)',
  border: '1px solid var(--border-color, #dee2e6)',
  borderRadius: 'var(--border-radius-lg, 8px)',
  display: 'flex',
  flexWrap: 'wrap', // Allow wrapping of filter groups
  gap: '1.5rem', // Gap between filter groups
  alignItems: 'flex-start', // Align items to the start of each line
};

const filterGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column', // Stack label and control vertically
  gap: '0.5rem', // Gap between label and control
};

const labelStyle: React.CSSProperties = {
  fontWeight: 'bold',
  fontSize: '0.9rem',
  color: 'var(--text-color-secondary, #555)',
  marginBottom: '0.25rem',
};

const selectStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--border-radius-md, 6px)',
  border: '1px solid var(--border-color, #ccc)',
  backgroundColor: 'var(--surface-color, #fff)',
  minWidth: '150px', // Give selects a decent minimum width
};

const tagContainerStyle: React.CSSProperties = {
  maxHeight: '100px', // Limit height for many tags
  overflowY: 'auto',
  border: '1px solid var(--border-color, #ccc)',
  padding: '0.5rem',
  borderRadius: 'var(--border-radius-md, 6px)',
  backgroundColor: 'var(--surface-color, #fff)', // Background for the tag box
};

const tagCheckboxStyle: React.CSSProperties = {
  display: 'block', // Each checkbox on a new line
  marginBottom: '0.25rem',
};

const sortButtonStyle: React.CSSProperties = {
  padding: '0.5rem 0.75rem',
  borderRadius: 'var(--border-radius-md, 6px)',
  border: '1px solid var(--border-color, #ccc)',
  backgroundColor: 'var(--surface-color-hover, #e9ecef)',
  cursor: 'pointer',
  marginLeft: '0.5rem',
};


const KanbanFilters: React.FC<KanbanFiltersProps> = ({
  allTags,
  currentFilters,
  onFilterChange,
  currentSort,
  onSortChange,
}) => {
  const handleTagChange = (tag: string) => {
    const newSelectedTags = currentFilters.tags.includes(tag)
      ? currentFilters.tags.filter(t => t !== tag)
      : [...currentFilters.tags, tag];
    onFilterChange('tags', newSelectedTags);
  };

  const handleRewardStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange('rewardStatus', e.target.value as 'any' | 'rewarded' | 'not_rewarded');
  };

  const handleSortFieldChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSortChange(e.target.value, currentSort.direction);
  };

  const toggleSortDirection = () => {
    onSortChange(currentSort.field, currentSort.direction === 'asc' ? 'desc' : 'asc');
  };

  const uniqueSortedTags = useMemo(() => [...new Set(allTags)].sort(), [allTags]);

  return (
    <div style={containerStyle} aria-labelledby="filters-heading">
      <h3 id="filters-heading" style={{ width: '100%', margin: '0 0 1rem 0', fontSize: '1.2rem' }}>Filters & Sort</h3>

      <div style={filterGroupStyle}>
        <label htmlFor="tag-filter" style={labelStyle}>Filter by Tags:</label>
        <div id="tag-filter" style={tagContainerStyle} role="group" aria-labelledby="tag-filter-label">
           {uniqueSortedTags.length > 0 ? uniqueSortedTags.map(tag => (
            <label key={tag} style={tagCheckboxStyle} htmlFor={`tag-${tag}`}>
              <input
                type="checkbox"
                id={`tag-${tag}`}
                value={tag}
                checked={currentFilters.tags.includes(tag)}
                onChange={() => handleTagChange(tag)}
                style={{ marginRight: '0.5rem' }}
              />
              {tag}
            </label>
          )) : <span style={{fontSize: '0.9em', color: 'var(--text-color-secondary, #777)'}}>No tags available</span>}
        </div>
      </div>

      <div style={filterGroupStyle}>
        <label htmlFor="reward-status-filter" style={labelStyle}>Filter by Reward Status:</label>
        <select
          id="reward-status-filter"
          value={currentFilters.rewardStatus}
          onChange={handleRewardStatusChange}
          style={selectStyle}
        >
          <option value="any">Any Reward Status</option>
          <option value="rewarded">Has Reward</option>
          <option value="not_rewarded">No Reward</option>
        </select>
      </div>

      <div style={filterGroupStyle}>
        <label htmlFor="sort-field" style={labelStyle}>Sort by:</label>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <select
            id="sort-field"
            value={currentSort.field}
            onChange={handleSortFieldChange}
            style={selectStyle}
          >
            <option value="instanceDate">Due Date</option>
            <option value="title">Title</option>
            <option value="rewardAmount">Reward Amount</option>
            {/* Add other sortable fields as needed */}
          </select>
          <button
            onClick={toggleSortDirection}
            style={sortButtonStyle}
            aria-label={`Sort direction: ${currentSort.direction === 'asc' ? 'Ascending' : 'Descending'}. Toggle direction.`}
          >
            {currentSort.direction === 'asc' ? '↑ Asc' : '↓ Desc'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KanbanFilters;
