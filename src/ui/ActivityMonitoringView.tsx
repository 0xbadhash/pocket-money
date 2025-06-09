// src/ui/ActivityMonitoringView.tsx
import React from 'react';
import ActivityFilters from './activity_monitoring_components/ActivityFilters';
import ActivityChart from './activity_monitoring_components/ActivityChart';
import DetailedTransactionList from './activity_monitoring_components/DetailedTransactionList';
import { useFinancialContext } from '../../contexts/FinancialContext'; // Import context hook

const ActivityMonitoringView = () => {
  const { financialData } = useFinancialContext(); // Get all financial data

  // For now, we pass all transactions. Filtering logic will be added here later.
  const transactionsToDisplay = financialData.transactions;

  return (
    <div className="activity-monitoring-view">
      <header className="view-header">
        <h1>Activity Monitoring</h1>
      </header>
      <section className="activity-controls">
        <ActivityFilters /> {/* ActivityFilters will eventually influence transactionsToDisplay */}
      </section>
      <section className="activity-summary-visuals">
        <ActivityChart /> {/* This might also use filtered transactions later */}
      </section>
      <section className="activity-detailed-list">
        <DetailedTransactionList transactionsToDisplay={transactionsToDisplay} />
      </section>
    </div>
  );
};

export default ActivityMonitoringView;
