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

  const getIconClass = (): string => {
    switch (issue.type) {
      case 'Disabled': return styles.disabled;
      case 'Dual-Licensed': return styles.dual;
      case 'Inactive 90+': return styles.inactive;
      case 'Service Account': return styles.service;
      default: return '';
    }
  };

  const getNumberClass = (): string => {
    switch (issue.type) {
      case 'Disabled': return styles.disabled;
      case 'Dual-Licensed': return styles.dual;
      case 'Inactive 90+': return styles.inactive;
      case 'Service Account': return styles.service;
      default: return '';
    }
  };

  const renderIcon = (): React.ReactElement => {
    const iconProps = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2 };

    switch (issue.type) {
      case 'Disabled':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
          </svg>
        );
      case 'Dual-Licensed':
        return (
          <svg {...iconProps}>
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        );
      case 'Inactive 90+':
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        );
      case 'Service Account':
        return (
          <svg {...iconProps}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        );
      default:
        return (
          <svg {...iconProps}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        );
    }
  };

  const formatSavings = (amount: number): string => {
    if (amount === 0) return 'Review needed';
    if (amount >= 1000) {
      return `\u00A3${(amount / 1000).toFixed(1)}k`;
    }
    return `\u00A3${amount.toLocaleString()}`;
  };

  return (
    <div
      className={`${styles.issueCard} ${isActive ? styles.active : ''} ${getSeverityClass()}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className={`${styles.issueIcon} ${getIconClass()}`}>{renderIcon()}</div>
      <div className={styles.issueContent}>
        <div className={`${styles.issueNumber} ${getNumberClass()}`}>{issue.count}</div>
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
