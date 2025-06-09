// src/ui/activity_monitoring_components/ActivityFilters.tsx
import React, { useState, useContext } from 'react'; // Import useContext
import type { FilterCriteria } from '../ActivityMonitoringView';
import { UserContext } from '../../contexts/UserContext'; // Import UserContext

interface ActivityFiltersProps {
  onApplyFilters: (filters: FilterCriteria) => void;
}

const ActivityFilters: React.FC<ActivityFiltersProps> = ({ onApplyFilters }) => {
  const [selectedKid, setSelectedKid] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const userContext = useContext(UserContext); // Consume UserContext
  const kids = userContext?.user?.kids || []; // Get kids array, default to empty if not available

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
        <div>
          <label htmlFor="kidSelect">Child:</label>
          <select
            id="kidSelect"
            name="kidSelect"
            value={selectedKid}
            onChange={(e) => setSelectedKid(e.target.value)}
            disabled={userContext?.loading} // Disable while loading user/kid data
          >
            <option value="all">All Kids</option>
            {kids.map(kid => (
              <option key={kid.id} value={kid.id}>
                {kid.name}
              </option>
            ))}
          </select>
        </div>
        {/* ... rest of the form elements (date pickers, category select) ... */}
        <div>
          <label htmlFor="dateStart">Start Date:</label>
          <input
            type="date"
            id="dateStart"
            name="dateStart"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <span style={{ margin: '0 8px' }}>to</span>
          <label htmlFor="dateEnd" style={{minWidth: 'auto', marginRight: '8px'}}>End Date:</label>
          <input
            type="date"
            id="dateEnd"
            name="dateEnd"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="categorySelect">Category:</label>
          <select
            id="categorySelect"
            name="categorySelect"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            <option value="food">Food</option>
            <option value="games">Games</option>
            <option value="clothes">Clothes</option>
            <option value="allowance">Allowance</option>
            <option value="income">Income</option>
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
