import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import styles from '../LicenseManagement.module.scss';

export interface ISpendByTypeData {
  name: string;
  value: number;
  color: string;
}

export interface ISpendByTypeChartProps {
  data: ISpendByTypeData[];
  title?: string;
}

// Lebara brand colour palette for charts
const COLORS = ['#E4007D', '#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8'];

/**
 * Spend By Type Chart - Donut chart showing licence spend breakdown
 */
const SpendByTypeChart: React.FC<ISpendByTypeChartProps> = ({
  data,
  title = 'Spend by Licence Type'
}) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `\u00A3${(value / 1000).toFixed(1)}k`;
    }
    return `\u00A3${value.toLocaleString()}`;
  };

  const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number }> }> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div style={{
          background: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '12px',
          color: '#F9FAFB'
        }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{item.name}</p>
          <p style={{ margin: '4px 0 0', color: '#9CA3AF' }}>
            {formatCurrency(item.value)} ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartTitle}>{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ textAlign: 'center', marginTop: '-20px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>
          {formatCurrency(total)}
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>Monthly Spend</div>
      </div>
    </div>
  );
};

export default SpendByTypeChart;
