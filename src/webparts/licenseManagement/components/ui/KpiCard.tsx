import * as React from 'react';
import styles from '../LicenseManagement.module.scss';

export interface IKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    value: string;
    isPositive?: boolean;
  };
  color?: 'purple' | 'green' | 'orange' | 'red' | 'blue';
  onClick?: () => void;
}

/**
 * KPI Card component for displaying key metrics
 * Matches the Lebara dashboard design with gradient borders
 */
const KpiCard: React.FC<IKpiCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  color = 'purple',
  onClick
}) => {
  const renderTrendIcon = (): React.ReactElement | null => {
    if (!trend) return null;

    const iconProps = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (trend.direction) {
      case 'up':
        return (
          <svg {...iconProps}>
            <polyline points="18 15 12 9 6 15" />
          </svg>
        );
      case 'down':
        return (
          <svg {...iconProps}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        );
    }
  };

  const getTrendClass = (): string => {
    if (!trend) return '';
    if (trend.isPositive !== undefined) {
      return trend.isPositive ? styles.trendPositive : styles.trendNegative;
    }
    return trend.direction === 'up' ? styles.trendPositive : styles.trendNegative;
  };

  const colorClass = `kpiCard${color.charAt(0).toUpperCase() + color.slice(1)}`;

  return (
    <div
      className={`${styles.kpiCard} ${styles[colorClass]} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={styles.kpiHeader}>
        <span className={styles.kpiTitle}>{title}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiFooter}>
        {subtitle && <span className={styles.kpiSubtitle}>{subtitle}</span>}
        {trend && (
          <span className={`${styles.kpiTrend} ${getTrendClass()}`}>
            {renderTrendIcon()} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
