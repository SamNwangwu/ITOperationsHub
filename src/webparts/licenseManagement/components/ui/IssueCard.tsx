import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IIssueCategory } from '../../models/ILicenceData';

export interface IIssueCardProps {
  issue: IIssueCategory;
  isActive?: boolean;
  onClick?: () => void;
}

/**
 * Issue Card component for displaying licence issues
 * Shows issue type, count, potential savings
 */
const IssueCard: React.FC<IIssueCardProps> = ({
  issue,
  isActive = false,
  onClick
}) => {
  const getSeverityClass = (): string => {
    switch (issue.severity) {
      case 'critical': return styles.severityCritical;
      case 'warning': return styles.severityWarning;
      default: return styles.severityInfo;
    }
  };

  const formatSavings = (amount: number): string => {
    if (amount === 0) return 'Review needed';
    if (amount >= 1000) {
      return `£${(amount / 1000).toFixed(1)}k`;
    }
    return `£${amount.toLocaleString()}`;
  };

  return (
    <div
      className={`${styles.issueCard} ${isActive ? styles.active : ''} ${getSeverityClass()}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className={styles.issueIcon}>{issue.icon}</div>
      <div className={styles.issueContent}>
        <div className={styles.issueNumber}>{issue.count}</div>
        <div className={styles.issueLabel}>{issue.type}</div>
        <div className={styles.issueDesc}>{issue.description}</div>
      </div>
      {issue.potentialSavings > 0 && (
        <div className={styles.issueSavings}>
          <span className={styles.savingsLabel}>Potential savings</span>
          <span className={styles.savingsValue}>{formatSavings(issue.potentialSavings)}/yr</span>
        </div>
      )}
    </div>
  );
};

export default IssueCard;
