import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
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
const COLORS = ['#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8', '#374151'];

const MAX_ITEMS = 6;

/**
 * Spend By Type Chart - Donut chart with right-side legend
 * Groups items beyond top 5 into "Other" to prevent legend overlap
 */
const SpendByTypeChart: React.FC<ISpendByTypeChartProps> = ({
  data,
  title = 'Spend by Licence Type'
}) => {
  // Group data: top items + "Other"
  const chartData = React.useMemo(() => {
    if (data.length <= MAX_ITEMS) return data;

    const top = data.slice(0, MAX_ITEMS - 1);
    const rest = data.slice(MAX_ITEMS - 1);
    const otherValue = rest.reduce((sum, item) => sum + item.value, 0);

    return [
      ...top,
      { name: `Other (${rest.length})`, value: otherValue, color: '#6B7280' }
    ];
  }, [data]);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `\u00A3${(value / 1000).toFixed(1)}k`;
    }
    return `\u00A3${value.toLocaleString()}`;
  };

  const truncate = (str: string, max: number): string => {
    return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
  };

  const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number }> }> = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
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

      {/* Total spend header */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#F9FAFB' }}>
          {formatCurrency(total)}
        </div>
        <div style={{ fontSize: '12px', color: '#6B7280' }}>Monthly Spend</div>
      </div>

      {/* Chart + Legend side by side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Donut chart */}
        <div style={{ width: '180px', height: '180px', flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Right-side legend list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {chartData.map((item, index) => {
            const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
            return (
              <div key={item.name} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 0',
                fontSize: '12px'
              }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  background: item.color || COLORS[index % COLORS.length],
                  flexShrink: 0
                }} />
                <div style={{
                  flex: 1,
                  color: '#9CA3AF',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {truncate(item.name, 22)}
                </div>
                <div style={{
                  color: '#F9FAFB',
                  fontWeight: 600,
                  flexShrink: 0
                }}>
                  {pct}%
                </div>
                <div style={{
                  width: '50px',
                  height: '4px',
                  background: '#1F2937',
                  borderRadius: '2px',
                  flexShrink: 0,
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${pct}%`,
                    height: '100%',
                    background: item.color || COLORS[index % COLORS.length],
                    borderRadius: '2px'
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SpendByTypeChart;
