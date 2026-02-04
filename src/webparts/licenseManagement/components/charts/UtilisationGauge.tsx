import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import styles from '../LicenseManagement.module.scss';

export interface IUtilisationGaugeProps {
  value: number;
  title: string;
  subtitle?: string;
}

/**
 * Utilisation Gauge - Semi-circular gauge showing utilisation percentage
 * Shows "100% +X%" for over-allocated SKUs (>100%)
 */
const UtilisationGauge: React.FC<IUtilisationGaugeProps> = ({
  value,
  title,
  subtitle
}) => {
  // Clamp value between 0 and 100 for the arc display
  const clampedValue = Math.max(0, Math.min(100, value));
  const isOverAllocated = value > 100;

  // Determine colour based on utilisation
  const getColour = (pct: number): string => {
    if (pct >= 100) return '#EF4444'; // Over-allocated or at capacity - red
    if (pct >= 90) return '#F59E0B'; // Near capacity - amber
    if (pct >= 70) return '#10B981'; // Healthy - green
    if (pct >= 50) return '#00A4E4'; // Moderate - cyan
    return '#6B7280'; // Under-utilised - grey
  };

  // Arc uses clamped colour (shows full red arc for over-allocated)
  const arcColour = getColour(clampedValue);
  // Text colour reflects actual state
  const textColour = isOverAllocated ? '#EF4444' : arcColour;

  // Data for the gauge (filled portion and empty portion)
  const data = [
    { name: 'filled', value: clampedValue },
    { name: 'empty', value: 100 - clampedValue }
  ];

  return (
    <div className={styles.chartContainer} style={{ padding: '16px', textAlign: 'center' }}>
      <div className={styles.chartTitle} style={{ marginBottom: '8px' }}>{title}</div>
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="100%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
          >
            <Cell key="filled" fill={arcColour} />
            <Cell key="empty" fill="#1F2937" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div style={{ marginTop: '-60px', position: 'relative' }}>
        <div style={{
          fontSize: '28px',
          fontWeight: 700,
          color: textColour
        }}>
          {isOverAllocated ? (
            <>
              100%
              <span style={{ fontSize: '13px', color: '#EF4444', marginLeft: '4px' }}>
                +{Math.round(value - 100)}%
              </span>
            </>
          ) : (
            <>{Math.round(value)}%</>
          )}
        </div>
        {subtitle && (
          <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilisationGauge;
