import * as React from 'react';
import styles from '../LicenseManagement.module.scss';

export interface IKpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
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
 * Matches the Lebara dashboard design
 */
const KpiCard: React.FC<IKpiCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'purple',
  onClick
}) => {
  const getTrendIcon = (): string => {
    if (!trend) return '';
    switch (trend.direction) {
      case 'up': return '\u2191'; // Up arrow
      case 'down': return '\u2193'; // Down arrow
      default: return '\u2192'; // Right arrow (stable)
    }
  };

  const getTrendClass = (): string => {
    if (!trend) return '';
    if (trend.isPositive !== undefined) {
      return trend.isPositive ? styles.trendPositive : styles.trendNegative;
    }
    // Default: up is positive, down is negative
    return trend.direction === 'up' ? styles.trendPositive : styles.trendNegative;
  };

  return (
    <div
      className={`${styles.kpiCard} ${styles[`kpiCard${color.charAt(0).toUpperCase() + color.slice(1)}`]} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={styles.kpiHeader}>
        {icon && <span className={styles.kpiIcon}>{icon}</span>}
        <span className={styles.kpiTitle}>{title}</span>
      </div>
      <div className={styles.kpiValue}>{value}</div>
      <div className={styles.kpiFooter}>
        {subtitle && <span className={styles.kpiSubtitle}>{subtitle}</span>}
        {trend && (
          <span className={`${styles.kpiTrend} ${getTrendClass()}`}>
            {getTrendIcon()} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
};

export default KpiCard;
