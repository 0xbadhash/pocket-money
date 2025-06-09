// src/ui/ActivityMonitoringView.tsx
import React, { useState } from 'react';
import ActivityFilters from './activity_monitoring_components/ActivityFilters';
import ActivityChart from './activity_monitoring_components/ActivityChart';
import DetailedTransactionList from './activity_monitoring_components/DetailedTransactionList';
import { useFinancialContext, Transaction } from '../contexts/FinancialContext'; // Import Transaction type

// Define the shape of the filter criteria
export interface FilterCriteria {
  kid: string;
  category: string;
  startDate: string;
  endDate: string;
}

const ActivityMonitoringView = () => {
  const { financialData } = useFinancialContext();

  const [activeFilters, setActiveFilters] = useState<FilterCriteria>({
    kid: 'all',
    category: 'all',
    startDate: '',
    endDate: '',
  });

  const handleApplyFiltersUpdate = (filters: FilterCriteria) => {
    console.log('Filters received in ActivityMonitoringView:', filters);
    setActiveFilters(filters);
  };

  // Filter transactions based on activeFilters
  let transactionsToDisplay: Transaction[] = financialData.transactions;

  if (activeFilters.kid !== 'all') {
    transactionsToDisplay = transactionsToDisplay.filter(
      (tx) => tx.kidId === activeFilters.kid
    );
  }
  if (activeFilters.category !== 'all') {
    transactionsToDisplay = transactionsToDisplay.filter(
      (tx) => tx.category.toLowerCase() === activeFilters.category.toLowerCase()
    );
  }
  if (activeFilters.startDate) {
    transactionsToDisplay = transactionsToDisplay.filter(
      (tx) => new Date(tx.date) >= new Date(activeFilters.startDate)
    );
  }
  if (activeFilters.endDate) {
    // To include the end date, we should compare against the end of that day
    // or ensure the date comparison is inclusive. new Date(str) creates date at midnight.
    // For simplicity, if tx.date is '2023-11-15' and endDate is '2023-11-15',
    // new Date('2023-11-15') >= new Date('2023-11-15') is true.
    transactionsToDisplay = transactionsToDisplay.filter(
      (tx) => new Date(tx.date) <= new Date(activeFilters.endDate)
    );
  }

  return (
    <div className="activity-monitoring-view">
      <header className="view-header">
        <h1>Activity Monitoring</h1>
      </header>
      <section className="activity-controls">
        <ActivityFilters onApplyFilters={handleApplyFiltersUpdate} />
      </section>
      <section className="activity-summary-visuals">
        {/* This might also use filtered transactions later */}
        <ActivityChart transactionsForChart={transactionsToDisplay} />
      </section>
      <section className="activity-detailed-list">
        <DetailedTransactionList transactionsToDisplay={transactionsToDisplay} />
      </section>
    </div>
  );
};

export default ActivityMonitoringView;
