// src/ui/activity_monitoring_components/ActivityFilters.tsx
import React, { useState } from 'react'; // Import useState

const ActivityFilters = () => {
  // State for filter inputs
  const [selectedKid, setSelectedKid] = useState('all'); // Default to 'all'
  const [startDate, setStartDate] = useState(''); // Default to empty
  const [endDate, setEndDate] = useState(''); // Default to empty
  const [selectedCategory, setSelectedCategory] = useState('all'); // Default to 'all'

  // Placeholder for handling filter application
  const handleApplyFilters = () => {
    console.log('Applying filters (from ActivityFilters component):');
    console.log('Selected Kid:', selectedKid);
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    console.log('Selected Category:', selectedCategory);
    // Actual filtering logic will be implemented later
  };

  return (
    <div className="activity-filters">
      <h4>Filters</h4>
      {/* <form> or <div> can be used here. If <form>, onSubmit might be useful later. */}
      <div>
        <div>
          <label htmlFor="kidSelect">Child:</label>
          <select
            id="kidSelect"
            name="kidSelect"
            value={selectedKid} // Controlled component
            onChange={(e) => setSelectedKid(e.target.value)} // Update state
          >
            <option value="all">All Kids</option>
            <option value="kid_a">Kid A</option> {/* These would ideally come from context/props later */}
            <option value="kid_b">Kid B</option>
          </select>
        </div>
        <div>
          <label htmlFor="dateStart">Start Date:</label>
          <input
            type="date"
            id="dateStart"
            name="dateStart"
            value={startDate} // Controlled component
            onChange={(e) => setStartDate(e.target.value)} // Update state
          />
          <span style={{ margin: '0 8px' }}>to</span>
          <label htmlFor="dateEnd" style={{minWidth: 'auto', marginRight: '8px'}}>End Date:</label>
          <input
            type="date"
            id="dateEnd"
            name="dateEnd"
            value={endDate} // Controlled component
            onChange={(e) => setEndDate(e.target.value)} // Update state
          />
        </div>
        <div>
          <label htmlFor="categorySelect">Category:</label>
          <select
            id="categorySelect"
            name="categorySelect"
            value={selectedCategory} // Controlled component
            onChange={(e) => setSelectedCategory(e.target.value)} // Update state
          >
            <option value="all">All Categories</option>
            <option value="food">Food</option>
            <option value="games">Games</option>
            <option value="clothes">Clothes</option>
            <option value="allowance">Allowance</option>
            <option value="income">Income</option> {/* Added from FinancialContext example */}
            {/* Categories could also be dynamic later */}
          </select>
        </div>
        <button type="button" onClick={handleApplyFilters} style={{marginTop: '10px'}}>
          Apply Filters
        </button>
      </div>
    </div>
  );
};

export default ActivityFilters;
