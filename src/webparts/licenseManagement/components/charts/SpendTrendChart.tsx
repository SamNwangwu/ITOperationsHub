import * as React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import styles from '../LicenseManagement.module.scss';

export interface ISpendTrendData {
  date: string;
  spend: number;
  users?: number;
}

export interface ISpendTrendChartProps {
  data: ISpendTrendData[];
  title?: string;
  showUsers?: boolean;
}

/**
 * Spend Trend Chart - Line chart showing spend over time
 */
const SpendTrendChart: React.FC<ISpendTrendChartProps> = ({
  data,
  title = 'Monthly Spend Trend',
  showUsers = false
}) => {
  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `\u00A3${(value / 1000).toFixed(0)}k`;
    }
    return `\u00A3${value}`;
  };

  const CustomTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ name: string; value: number; color: string }>;
    label?: string;
  }> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: '#1F2937',
          border: '1px solid #374151',
          borderRadius: '8px',
          padding: '12px',
          color: '#F9FAFB'
        }}>
          <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px' }}>{label}</p>
          {payload.map((item, index) => (
            <p key={index} style={{ margin: '4px 0 0', color: item.color }}>
              {item.name}: {item.name === 'Spend' ? formatCurrency(item.value) : item.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartTitle}>{title}</div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="date"
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
          />
          <YAxis
            stroke="#6B7280"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="spend"
            name="Spend"
            stroke="#E4007D"
            strokeWidth={2}
            dot={{ fill: '#E4007D', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
          {showUsers && (
            <Line
              type="monotone"
              dataKey="users"
              name="Users"
              stroke="#00A4E4"
              strokeWidth={2}
              dot={{ fill: '#00A4E4', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SpendTrendChart;
