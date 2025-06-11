// src/ui/activity_monitoring_components/ActivityFilters.tsx
import React, { useState, useContext } from 'react';
import type { FilterCriteria } from '../ActivityMonitoringView';
import { UserContext } from '../../contexts/UserContext';

interface ActivityFiltersProps {
  onApplyFilters: (filters: FilterCriteria) => void;
  availableCategories: string[]; // <-- Add new prop to interface
}

const ActivityFilters: React.FC<ActivityFiltersProps> = ({ onApplyFilters, availableCategories }) => { // <-- Destructure new prop
  const [selectedKid, setSelectedKid] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const userContext = useContext(UserContext);
  const kids = userContext?.user?.kids || [];

  const handleApplyFiltersInternal = () => {
    onApplyFilters({
      kid: selectedKid,
      category: selectedCategory,
      startDate: startDate,
      endDate: endDate,
    });
  };

  return (
    <div className="activity-filters">
      <h4>Filters</h4>
      <div>
        {/* Kid Select (no changes here) */}
        <div>
          <label htmlFor="kidSelect">Child:</label>
          <select
            id="kidSelect"
            name="kidSelect"
            value={selectedKid}
            onChange={(e) => setSelectedKid(e.target.value)}
            disabled={userContext?.loading}
          >
            <option value="all">All Kids</option>
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>

        {/* Date Filters (no changes here) */}
        <div>
          <label htmlFor="dateStart">Start Date:</label>
          <input type="date" id="dateStart" name="dateStart" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          <span style={{ margin: '0 8px' }}>to</span>
          <label htmlFor="dateEnd" style={{minWidth: 'auto', marginRight: '8px'}}>End Date:</label>
          <input type="date" id="dateEnd" name="dateEnd" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>

        {/* Category Select (This is what needs to be updated) */}
        <div>
          <label htmlFor="categorySelect">Category:</label>
          <select
            id="categorySelect"
            name="categorySelect"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category.toLowerCase()}> {/* Use lowercased category for value for consistency */}
                {category} {/* Display original casing */}
              </option>
            ))}
          </select>
        </div>

        <button type="button" onClick={handleApplyFiltersInternal} style={{marginTop: '10px'}}>
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default ActivityFilters;
