// src/ui/ActivityMonitoringView.tsx
import React, { useState, useMemo } from 'react'; // Import useMemo
import ActivityFilters from './activity_monitoring_components/ActivityFilters';
import ActivityChart from './activity_monitoring_components/ActivityChart';
import DetailedTransactionList from './activity_monitoring_components/DetailedTransactionList';
import { useFinancialContext } from '../contexts/FinancialContext';
import type { Transaction } from '../types';

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

  // Derive unique categories for filter dropdown
  const uniqueCategories = useMemo(() => {
    const categories = new Set<string>();
    financialData.transactions.forEach(tx => {
      if (tx.category && tx.category.trim() !== '') { // Ensure category is not null/empty
        categories.add(tx.category);
      }
    });
    return Array.from(categories).sort();
  }, [financialData.transactions]);

  // console.log('Unique Categories:', uniqueCategories); // For debugging

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
        {/* We will pass uniqueCategories and handleApplyFiltersUpdate to ActivityFilters later */}
        <ActivityFilters onApplyFilters={handleApplyFiltersUpdate} availableCategories={uniqueCategories} />
      </section>
      <section className="activity-summary-visuals">
        <ActivityChart transactionsForChart={transactionsToDisplay} />
      </section>
      <section className="activity-detailed-list">
        <DetailedTransactionList transactionsToDisplay={transactionsToDisplay} />
      </section>
    </div>
  );
};

export default ActivityMonitoringView;
