// src/ui/activity_monitoring_components/ActivityChart.tsx
import React from 'react';
import type { Transaction } from '../../contexts/FinancialContext'; // Assuming Transaction is exported

interface ActivityChartProps {
  transactionsForChart: Transaction[];
}

const ActivityChart: React.FC<ActivityChartProps> = ({ transactionsForChart }) => {
  // console.log('ActivityChart received transactions:', transactionsForChart.length);
  return (
    <div className="activity-chart">
      <h4>Spending Chart</h4>
      <div style={{ border: '1px dashed #ccc', padding: '20px', textAlign: 'center' }}>
        <p>[Chart Placeholder - e.g., Bar chart of spending by category]</p>
        <p>Displaying data for {transactionsForChart.length} transaction(s)</p>
      </div>
    </div>
  );
};

export default ActivityChart;
