import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IInsight } from '../../services/InsightEngine';

export interface IInsightCardProps {
  insight: IInsight;
  compact?: boolean;
}

/**
 * Insight Card component for displaying AI-generated insights
 * Uses severity-based border colours
 */
const InsightCard: React.FC<IInsightCardProps> = ({
  insight,
  compact = false
}) => {
  const renderTypeIcon = (): React.ReactElement => {
    const iconProps = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (insight.type) {
      case 'critical':
        return (
          <svg {...iconProps}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        );
      case 'warning':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
      case 'success':
        return (
          <svg {...iconProps}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
        );
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

  const renderTrendIcon = (): React.ReactElement | null => {
    if (!insight.trend) return null;

    const iconProps = { width: 12, height: 12, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (insight.trend) {
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
          </svg>
        );
    }
  };

  if (compact) {
    return (
      <div className={`${styles.insightCardCompact} ${getTypeClass()}`}>
        <span className={styles.insightIcon}>{renderTypeIcon()}</span>
        <span className={styles.insightTitle}>{insight.title}</span>
        {insight.metric && (
          <span className={styles.insightMetric}>
            {renderTrendIcon()} {insight.metric}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.insightCard} ${getTypeClass()}`}>
      <div className={styles.insightHeader}>
        <span className={styles.insightIcon}>{renderTypeIcon()}</span>
        <span className={styles.insightTitle}>{insight.title}</span>
        {insight.metric && (
          <span className={styles.insightMetric}>
            {renderTrendIcon()} {insight.metric}
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
