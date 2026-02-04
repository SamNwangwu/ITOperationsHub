import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IIssueCategory, IDowngradeSummary } from '../../models/ILicenceData';

export interface IActionCenterProps {
  issueCategories: IIssueCategory[];
  downgradeSummaries?: IDowngradeSummary[];
  onActionClick?: (actionType: string, data: unknown) => void;
}

interface IActionItem {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  count: number;
  savings: number;
  actionLabel: string;
  actionType: string;
  data: unknown;
}

/**
 * Action Center - V3 Component
 * Central hub for actionable items with quick actions
 */
const ActionCenter: React.FC<IActionCenterProps> = ({
  issueCategories,
  downgradeSummaries = [],
  onActionClick
}) => {
  // Build action items from issues and downgrades
  const actionItems: IActionItem[] = [];

  // Add issue-based actions
  issueCategories.forEach(issue => {
    if (issue.count === 0) return;

    let severity: 'critical' | 'warning' | 'info' = 'info';
    let actionLabel = 'Review';

    switch (issue.type) {
      case 'Disabled':
        severity = 'critical';
        actionLabel = 'Remove Licences';
        break;
      case 'Dual-Licensed':
        severity = 'warning';
        actionLabel = 'Fix Duplicates';
        break;
      case 'Inactive 90+':
        severity = 'warning';
        actionLabel = 'Review Users';
        break;
      case 'Service Account':
        severity = 'info';
        actionLabel = 'Review Accounts';
        break;
    }

    actionItems.push({
      id: `issue-${issue.type}`,
      severity,
      title: `${issue.count} ${issue.type.toLowerCase()} ${issue.count === 1 ? 'account' : 'accounts'}`,
      description: issue.description,
      count: issue.count,
      savings: issue.potentialSavings,
      actionLabel,
      actionType: 'issue',
      data: issue
    });
  });

  // Add downgrade recommendations
  downgradeSummaries.forEach(summary => {
    if (summary.count === 0) return;

    actionItems.push({
      id: `downgrade-${summary.type}`,
      severity: 'info',
      title: `${summary.count} ${summary.type} candidates`,
      description: summary.description,
      count: summary.count,
      savings: summary.totalAnnualSavings,
      actionLabel: 'Review',
      actionType: 'downgrade',
      data: summary
    });
  });

  // Sort by severity (critical first) then by savings
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  actionItems.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return b.savings - a.savings;
  });

  const getSeverityColor = (severity: 'critical' | 'warning' | 'info'): string => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
    }
  };

  const getSeverityBg = (severity: 'critical' | 'warning' | 'info'): string => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)';
      case 'warning': return 'rgba(245, 158, 11, 0.15)';
      case 'info': return 'rgba(59, 130, 246, 0.15)';
    }
  };

  const getSeverityIcon = (severity: 'critical' | 'warning' | 'info'): React.ReactElement => {
    switch (severity) {
      case 'critical':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
    }
  };

  const formatSavings = (value: number): string => {
    if (value >= 1000) {
      return `£${Math.round(value / 1000)}K`;
    }
    return `£${Math.round(value).toLocaleString()}`;
  };

  const totalPendingActions = actionItems.length;
  const totalSavings = actionItems.reduce((sum, item) => sum + item.savings, 0);
  const criticalCount = actionItems.filter(i => i.severity === 'critical').length;

  if (actionItems.length === 0) {
    return (
      <div style={{
        padding: '32px',
        textAlign: 'center',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(16, 185, 129, 0.3)'
      }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" style={{ marginBottom: '16px' }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#10B981', marginBottom: '8px' }}>
          All Clear!
        </div>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          No pending actions at this time
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1F2937',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1F2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: criticalCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'transparent'
      }}>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            Action Center
            <span style={{
              padding: '2px 8px',
              background: criticalCount > 0 ? '#EF4444' : '#F59E0B',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              color: '#fff'
            }}>
              {totalPendingActions} pending
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>
            {formatSavings(totalSavings)} potential annual savings
          </div>
        </div>
        {criticalCount > 0 && (
          <div style={{
            padding: '4px 10px',
            background: 'rgba(239, 68, 68, 0.2)',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#EF4444'
          }}>
            {criticalCount} urgent
          </div>
        )}
      </div>

      {/* Action Items */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {actionItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              padding: '14px 20px',
              borderBottom: index < actionItems.length - 1 ? '1px solid #1F2937' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: index % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
            }}
          >
            {/* Severity Icon */}
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: getSeverityBg(item.severity),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getSeverityColor(item.severity),
              flexShrink: 0
            }}>
              {getSeverityIcon(item.severity)}
            </div>

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '2px'
              }}>
                {item.title}
              </div>
              <div style={{
                fontSize: '11px',
                color: '#6B7280',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {item.description}
              </div>
            </div>

            {/* Savings */}
            {item.savings > 0 && (
              <div style={{
                textAlign: 'right',
                flexShrink: 0
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#10B981'
                }}>
                  {formatSavings(item.savings)}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#6B7280'
                }}>
                  /year
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={() => onActionClick?.(item.actionType, item.data)}
              style={{
                padding: '8px 14px',
                background: getSeverityBg(item.severity),
                border: `1px solid ${getSeverityColor(item.severity)}40`,
                borderRadius: '6px',
                color: getSeverityColor(item.severity),
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {item.actionLabel}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionCenter;
