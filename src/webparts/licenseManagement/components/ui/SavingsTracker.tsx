import * as React from 'react';
import styles from '../LicenseManagement.module.scss';

export interface ISavingsTrackerProps {
  identified: number;
  inProgress: number;
  realised: number;
  targetPct?: number; // Target realisation percentage
  onViewOpportunities?: () => void;
}

/**
 * Savings Tracker - V3 Component
 * Shows identified vs realised savings with progress bar
 */
const SavingsTracker: React.FC<ISavingsTrackerProps> = ({
  identified,
  inProgress,
  realised,
  targetPct = 60,
  onViewOpportunities
}) => {
  const total = identified + inProgress + realised;
  const realisedPct = total > 0 ? Math.round((realised / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const isOnTrack = realisedPct >= targetPct;

  // Format currency
  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${Math.round(value / 1000)}K`;
    }
    return `£${Math.round(value).toLocaleString()}`;
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(228, 0, 125, 0.15) 0%, rgba(0, 40, 158, 0.15) 100%)',
      border: '1px solid rgba(228, 0, 125, 0.3)',
      borderRadius: '12px',
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            fontSize: '11px',
            color: '#E4007D',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '4px'
          }}>
            Savings Progress
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#fff'
          }}>
            {formatCurrency(total)}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#9CA3AF'
          }}>
            Total potential annual savings
          </div>
        </div>
        <div style={{
          padding: '6px 12px',
          background: isOnTrack ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: 600,
          color: isOnTrack ? '#10B981' : '#F59E0B',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {isOnTrack ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          )}
          {isOnTrack ? 'On Track' : 'Needs Attention'}
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{
        height: '12px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '6px',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '12px'
      }}>
        {/* Realised */}
        <div style={{
          width: `${realisedPct}%`,
          background: 'linear-gradient(90deg, #10B981, #22c55e)',
          transition: 'width 0.5s ease'
        }} />
        {/* In Progress */}
        <div style={{
          width: `${inProgressPct}%`,
          background: 'linear-gradient(90deg, #F59E0B, #fbbf24)',
          transition: 'width 0.5s ease'
        }} />
        {/* Remaining is implicit (transparent) */}
      </div>

      {/* Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: '#10B981'
            }} />
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Realised</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
            {formatCurrency(realised)}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            {realisedPct}% complete
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: '#F59E0B'
            }} />
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>In Progress</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#F59E0B' }}>
            {formatCurrency(inProgress)}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            {inProgressPct}% pending
          </div>
        </div>

        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              background: 'rgba(255, 255, 255, 0.2)'
            }} />
            <span style={{ fontSize: '11px', color: '#9CA3AF' }}>Identified</span>
          </div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>
            {formatCurrency(identified)}
          </div>
          <div style={{ fontSize: '11px', color: '#6B7280' }}>
            {100 - realisedPct - inProgressPct}% remaining
          </div>
        </div>
      </div>

      {/* Action Button */}
      {onViewOpportunities && (
        <button
          onClick={onViewOpportunities}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: '#E4007D',
            border: 'none',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s'
          }}
        >
          View Opportunities
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
        </button>
      )}
    </div>
  );
};

export default SavingsTracker;
