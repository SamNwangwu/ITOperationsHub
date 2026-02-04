import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IAlert, AlertSeverity } from '../../models/ILicenceData';

export interface IAlertPanelProps {
  alerts: IAlert[];
  maxVisible?: number;
  onAlertClick?: (alert: IAlert) => void;
  onDismiss?: (alertId: string) => void;
  compact?: boolean;
}

/**
 * Alert Panel - V3 Component
 * Displays proactive alerts with severity indicators
 */
const AlertPanel: React.FC<IAlertPanelProps> = ({
  alerts,
  maxVisible = 5,
  onAlertClick,
  onDismiss,
  compact = false
}) => {
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hiddenCount = alerts.length - maxVisible;

  const getSeverityIcon = (severity: AlertSeverity): React.ReactElement => {
    switch (severity) {
      case 'critical':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
        );
      case 'warning':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        );
      case 'info':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        );
      case 'success':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        );
    }
  };

  const getSeverityColor = (severity: AlertSeverity): string => {
    switch (severity) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      case 'success': return '#10B981';
    }
  };

  const getSeverityBg = (severity: AlertSeverity): string => {
    switch (severity) {
      case 'critical': return 'rgba(239, 68, 68, 0.15)';
      case 'warning': return 'rgba(245, 158, 11, 0.15)';
      case 'info': return 'rgba(59, 130, 246, 0.15)';
      case 'success': return 'rgba(16, 185, 129, 0.15)';
    }
  };

  if (alerts.length === 0) {
    return (
      <div style={{
        padding: compact ? '12px 16px' : '20px',
        background: 'rgba(16, 185, 129, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        color: '#10B981'
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
        <span style={{ fontWeight: 500 }}>All clear - no alerts to display</span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: compact ? '8px' : '12px'
    }}>
      {visibleAlerts.map(alert => (
        <div
          key={alert.id}
          onClick={() => onAlertClick?.(alert)}
          style={{
            padding: compact ? '10px 14px' : '14px 18px',
            background: getSeverityBg(alert.severity),
            borderRadius: '8px',
            border: `1px solid ${getSeverityColor(alert.severity)}40`,
            borderLeft: `4px solid ${getSeverityColor(alert.severity)}`,
            cursor: onAlertClick ? 'pointer' : 'default',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <div style={{ color: getSeverityColor(alert.severity), marginTop: '2px' }}>
            {getSeverityIcon(alert.severity)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: compact ? '2px' : '4px'
            }}>
              <div style={{
                fontSize: compact ? '12px' : '13px',
                fontWeight: 600,
                color: '#fff'
              }}>
                {alert.title}
              </div>
              {alert.metric && (
                <span style={{
                  padding: '2px 8px',
                  background: getSeverityColor(alert.severity),
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap'
                }}>
                  {alert.metric}
                </span>
              )}
            </div>
            {!compact && (
              <div style={{
                fontSize: '12px',
                color: '#9CA3AF',
                lineHeight: '1.4'
              }}>
                {alert.description}
              </div>
            )}
            {alert.actionLabel && !compact && (
              <div style={{
                marginTop: '8px',
                fontSize: '11px',
                color: getSeverityColor(alert.severity),
                fontWeight: 500
              }}>
                {alert.actionLabel} →
              </div>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(alert.id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#6B7280',
                cursor: 'pointer',
                padding: '4px',
                marginTop: '-4px',
                marginRight: '-4px'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      ))}
      {hiddenCount > 0 && (
        <div style={{
          padding: '8px 16px',
          textAlign: 'center',
          fontSize: '12px',
          color: '#6B7280'
        }}>
          +{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

export default AlertPanel;
