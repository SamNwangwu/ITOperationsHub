import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IMonthComparisonData, IMonthComparison } from '../../models/ILicenceData';

export interface IMonthComparisonProps {
  data: IMonthComparisonData;
  compact?: boolean;
}

/**
 * Month Comparison - V3 Component
 * Shows month-over-month changes with visual indicators
 */
const MonthComparison: React.FC<IMonthComparisonProps> = ({ data, compact = false }) => {
  const getTrendIcon = (comparison: IMonthComparison): React.ReactElement => {
    if (comparison.trend === 'stable') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      );
    }
    if (comparison.trend === 'up') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      );
    }
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    );
  };

  const getTrendColor = (comparison: IMonthComparison): string => {
    if (comparison.trend === 'stable') return '#6B7280';
    return comparison.isPositive ? '#10B981' : '#EF4444';
  };

  const formatValue = (value: number, metric: string): string => {
    if (metric.includes('Utilisation') || metric.includes('%')) {
      return `${value}%`;
    }
    return value.toLocaleString();
  };

  const formatChange = (comparison: IMonthComparison): string => {
    if (comparison.trend === 'stable') return '→ No change';
    const sign = comparison.change > 0 ? '+' : '';
    const pctPart = comparison.changePct !== 0 ? ` (${comparison.changePct > 0 ? '+' : ''}${comparison.changePct}%)` : '';
    return `${sign}${comparison.change}${pctPart}`;
  };

  // Key metrics to show in compact view
  const keyMetrics = ['Total Licensed Users', 'Overall Utilisation', 'Total Issues', 'Assigned Licences'];
  const displayComparisons = compact
    ? data.comparisons.filter(c => keyMetrics.indexOf(c.metric) >= 0)
    : data.comparisons;

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1F2937',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: compact ? '12px 16px' : '16px 20px',
        borderBottom: '1px solid #1F2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <div style={{
            fontSize: compact ? '13px' : '14px',
            fontWeight: 600,
            color: '#fff'
          }}>
            {data.previousMonth} → {data.currentMonth}
          </div>
          {!compact && (
            <div style={{
              fontSize: '12px',
              color: '#6B7280',
              marginTop: '2px'
            }}>
              Month-over-month comparison
            </div>
          )}
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A4E4" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </div>
      </div>

      {/* Summary Text */}
      {!compact && data.summaryText && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(0, 164, 228, 0.1)',
          borderBottom: '1px solid #1F2937',
          fontSize: '13px',
          color: '#9CA3AF',
          lineHeight: '1.5'
        }}>
          {data.summaryText}
        </div>
      )}

      {/* Comparisons Table */}
      <div style={{ padding: compact ? '8px 0' : '12px 0' }}>
        {displayComparisons.map((comparison, index) => (
          <div
            key={comparison.metric}
            style={{
              display: 'grid',
              gridTemplateColumns: compact ? '1fr auto auto' : '1fr auto auto auto',
              gap: compact ? '12px' : '16px',
              padding: compact ? '8px 16px' : '10px 20px',
              alignItems: 'center',
              background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
            }}
          >
            {/* Metric Name */}
            <div style={{
              fontSize: compact ? '12px' : '13px',
              color: '#fff'
            }}>
              {comparison.metric}
            </div>

            {/* Previous Value (hidden in compact) */}
            {!compact && (
              <div style={{
                fontSize: '12px',
                color: '#6B7280',
                textAlign: 'right',
                minWidth: '60px'
              }}>
                {formatValue(comparison.previousValue, comparison.metric)}
              </div>
            )}

            {/* Current Value */}
            <div style={{
              fontSize: compact ? '13px' : '14px',
              fontWeight: 600,
              color: '#fff',
              textAlign: 'right',
              minWidth: '60px'
            }}>
              {formatValue(comparison.currentValue, comparison.metric)}
            </div>

            {/* Change Indicator */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: getTrendColor(comparison),
              fontSize: compact ? '11px' : '12px',
              fontWeight: 500,
              minWidth: compact ? '60px' : '100px',
              justifyContent: 'flex-end'
            }}>
              {getTrendIcon(comparison)}
              <span>{formatChange(comparison)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* View More Link (if compact and more data available) */}
      {compact && data.comparisons.length > displayComparisons.length && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid #1F2937',
          textAlign: 'center',
          fontSize: '11px',
          color: '#00A4E4',
          cursor: 'pointer'
        }}>
          View all {data.comparisons.length} metrics →
        </div>
      )}
    </div>
  );
};

export default MonthComparison;
