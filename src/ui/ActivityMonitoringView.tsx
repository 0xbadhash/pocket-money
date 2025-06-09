// src/ui/ActivityMonitoringView.tsx
import React from 'react';
import ActivityFilters from './activity_monitoring_components/ActivityFilters';
import ActivityChart from './activity_monitoring_components/ActivityChart';
import DetailedTransactionList from './activity_monitoring_components/DetailedTransactionList';

const ActivityMonitoringView = () => {
  return (
    <div className="activity-monitoring-view">
      <header className="view-header">
        <h1>Activity Monitoring</h1>
      </header>
      <section className="activity-controls">
        <ActivityFilters />
      </section>
      <section className="activity-summary-visuals">
        <ActivityChart />
      </section>
      <section className="activity-detailed-list">
        <DetailedTransactionList />
      </section>
    </div>
  );
};

export default ActivityMonitoringView;
