// src/ui/activity_monitoring_components/ActivityFilters.tsx
import React from 'react';

const ActivityFilters = () => {
  return (
    <div className="activity-filters">
      <h4>Filters</h4>
      <form>
        <div>
          <label htmlFor="kidSelect">Child:</label>
          <select id="kidSelect" name="kidSelect" defaultValue="all">
            <option value="all">All Kids</option>
            <option value="kid_a">Kid A</option>
            <option value="kid_b">Kid B</option>
          </select>
        </div>
        <div>
          <label htmlFor="dateRange">Date Range:</label>
          <input type="date" id="dateStart" name="dateStart" />
          <span>to</span>
          <input type="date" id="dateEnd" name="dateEnd" />
        </div>
        <div>
          <label htmlFor="categorySelect">Category:</label>
          <select id="categorySelect" name="categorySelect" defaultValue="all">
            <option value="all">All Categories</option>
            <option value="food">Food</option>
            <option value="games">Games</option>
            <option value="clothes">Clothes</option>
          </select>
        </div>
        <button type="button">Apply Filters</button>
      </form>
    </div>
  );
};

export default ActivityFilters;
