import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IInsight } from '../../services/InsightEngine';

export interface IInsightCardProps {
  insight: IInsight;
  compact?: boolean;
}

/**
 * Insight Card component for displaying AI-generated insights
 */
const InsightCard: React.FC<IInsightCardProps> = ({
  insight,
  compact = false
}) => {
  const getTypeIcon = (): string => {
    switch (insight.type) {
      case 'critical': return '\u26A0\uFE0F'; // Warning sign
      case 'warning': return '\u2139\uFE0F'; // Info
      case 'success': return '\u2705'; // Check mark
      default: return '\u{1F4CA}'; // Chart
    }
  };

  const getTypeClass = (): string => {
    switch (insight.type) {
      case 'critical': return styles.insightCritical;
      case 'warning': return styles.insightWarning;
      case 'success': return styles.insightSuccess;
      default: return styles.insightInfo;
    }
  };

  const getTrendIcon = (): string => {
    if (!insight.trend) return '';
    switch (insight.trend) {
      case 'up': return '\u2191';
      case 'down': return '\u2193';
      default: return '\u2192';
    }
  };

  if (compact) {
    return (
      <div className={`${styles.insightCardCompact} ${getTypeClass()}`}>
        <span className={styles.insightIcon}>{getTypeIcon()}</span>
        <span className={styles.insightTitle}>{insight.title}</span>
        {insight.metric && (
          <span className={styles.insightMetric}>
            {getTrendIcon()} {insight.metric}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.insightCard} ${getTypeClass()}`}>
      <div className={styles.insightHeader}>
        <span className={styles.insightIcon}>{getTypeIcon()}</span>
        <span className={styles.insightTitle}>{insight.title}</span>
        {insight.metric && (
          <span className={styles.insightMetric}>
            {getTrendIcon()} {insight.metric}
          </span>
        )}
      </div>
      <div className={styles.insightDescription}>{insight.description}</div>
      {insight.action && (
        <div className={styles.insightAction}>
          <span className={styles.actionLabel}>Recommended:</span> {insight.action}
        </div>
      )}
    </div>
  );
};

export default InsightCard;
