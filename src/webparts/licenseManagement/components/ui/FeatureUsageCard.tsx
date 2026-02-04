import * as React from 'react';
import { IUserUsageProfile, IFeatureUsageStats } from '../../models/ILicenceData';

export interface IFeatureUsageCardProps {
  profile: IUserUsageProfile;
  onDowngradeClick?: (profile: IUserUsageProfile) => void;
}

/**
 * Feature Usage Card - V3 Component
 * Shows individual user's feature usage and downgrade recommendation
 */
const FeatureUsageCard: React.FC<IFeatureUsageCardProps> = ({ profile, onDowngradeClick }) => {
  const getUtilisationColor = (pct: number): string => {
    if (pct >= 70) return '#10B981'; // Green - good utilisation
    if (pct >= 30) return '#F59E0B'; // Orange - moderate
    return '#EF4444'; // Red - low utilisation
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 80) return '#10B981';
    if (score >= 50) return '#F59E0B';
    return '#6B7280';
  };

  const formatCurrency = (value: number): string => {
    if (value >= 1000) {
      return `£${(value / 1000).toFixed(1)}K`;
    }
    return `£${Math.round(value).toLocaleString()}`;
  };

  return (
    <div style={{
      background: '#111827',
      border: profile.canDowngrade ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid #1F2937',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1F2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar */}
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #E4007D, #00289e)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 600,
            color: '#fff'
          }}>
            {profile.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              {profile.displayName}
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280' }}>
              {profile.department} • {profile.userPrincipalName}
            </div>
          </div>
        </div>

        {/* Licence Badge */}
        <div style={{
          padding: '4px 10px',
          borderRadius: '12px',
          fontSize: '10px',
          fontWeight: 600,
          background: profile.hasE5 ? 'rgba(129, 140, 248, 0.2)' : 'rgba(249, 115, 22, 0.2)',
          color: profile.hasE5 ? '#818CF8' : '#F97316'
        }}>
          {profile.hasE5 ? 'E5' : profile.hasE3 ? 'E3' : 'Other'}
        </div>
      </div>

      {/* E5 Utilisation (if E5 user) */}
      {profile.hasE5 && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>E5 Feature Utilisation</span>
            <span style={{
              fontSize: '16px',
              fontWeight: 700,
              color: getUtilisationColor(profile.e5UtilisationPct)
            }}>
              {profile.e5UtilisationPct}%
            </span>
          </div>

          {/* Utilisation Bar */}
          <div style={{
            height: '8px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '4px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${profile.e5UtilisationPct}%`,
              height: '100%',
              background: getUtilisationColor(profile.e5UtilisationPct),
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>

          {/* Features Used/Not Used */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#10B981', marginBottom: '4px', textTransform: 'uppercase' }}>
                Features Used ({profile.e5FeaturesUsed.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {profile.e5FeaturesUsed.slice(0, 3).map((feature, idx) => (
                  <span key={idx} style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#10B981'
                  }}>
                    {feature.length > 20 ? feature.slice(0, 18) + '...' : feature}
                  </span>
                ))}
                {profile.e5FeaturesUsed.length > 3 && (
                  <span style={{ fontSize: '9px', color: '#6B7280' }}>
                    +{profile.e5FeaturesUsed.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '10px', color: '#EF4444', marginBottom: '4px', textTransform: 'uppercase' }}>
                Not Used ({profile.e5FeaturesNotUsed.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {profile.e5FeaturesNotUsed.slice(0, 3).map((feature, idx) => (
                  <span key={idx} style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '9px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    color: '#EF4444'
                  }}>
                    {feature.length > 20 ? feature.slice(0, 18) + '...' : feature}
                  </span>
                ))}
                {profile.e5FeaturesNotUsed.length > 3 && (
                  <span style={{ fontSize: '9px', color: '#6B7280' }}>
                    +{profile.e5FeaturesNotUsed.length - 3} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Apps Usage */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '8px', textTransform: 'uppercase' }}>
          Core Apps Usage
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {['Outlook', 'Teams', 'Word', 'Excel', 'PowerPoint', 'OneNote'].map(app => {
            const isUsed = profile.appsUsed.indexOf(app) >= 0;
            return (
              <div key={app} style={{
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 500,
                background: isUsed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)',
                color: isUsed ? '#10B981' : '#6B7280',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {isUsed ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                )}
                {app}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendation */}
      {profile.canDowngrade && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{
                fontSize: '11px',
                color: '#EF4444',
                textTransform: 'uppercase',
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
                Downgrade Recommended
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                {profile.recommendedLicence || 'Remove Licence'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#10B981' }}>
                {formatCurrency(profile.potentialAnnualSavings)}
              </div>
              <div style={{ fontSize: '10px', color: '#6B7280' }}>/year savings</div>
            </div>
          </div>

          <div style={{
            fontSize: '12px',
            color: '#9CA3AF',
            marginBottom: '12px',
            lineHeight: '1.4'
          }}>
            {profile.downgradeReason}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '11px'
            }}>
              <span style={{ color: '#6B7280' }}>Confidence:</span>
              <span style={{
                fontWeight: 600,
                color: getConfidenceColor(profile.confidenceScore)
              }}>
                {profile.confidenceScore}%
              </span>
            </div>

            {onDowngradeClick && (
              <button
                onClick={() => onDowngradeClick(profile)}
                style={{
                  padding: '8px 16px',
                  background: '#EF4444',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Review
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {/* No Recommendation - Optimised */}
      {!profile.canDowngrade && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(16, 185, 129, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: 500 }}>
            Licence optimally assigned
          </span>
        </div>
      )}
    </div>
  );
};

export default FeatureUsageCard;

export interface IFeatureUsageStatsCardProps {
  stats: IFeatureUsageStats[];
}

/**
 * Feature Usage Stats Card - Shows overall E5 feature utilisation
 */
export const FeatureUsageStatsCard: React.FC<IFeatureUsageStatsCardProps> = ({ stats }) => {
  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1F2937',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1F2937'
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
          E5 Feature Utilisation
        </div>
        <div style={{ fontSize: '11px', color: '#6B7280' }}>
          Across all E5 licence holders
        </div>
      </div>

      <div style={{ padding: '8px 0' }}>
        {stats.map((stat, idx) => (
          <div
            key={stat.featureId}
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.02)'
            }}
          >
            {/* Feature Name */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '12px',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {stat.featureName}
              </div>
              <div style={{ fontSize: '10px', color: '#6B7280' }}>
                {stat.category}
              </div>
            </div>

            {/* Usage Bar */}
            <div style={{ width: '100px', flexShrink: 0 }}>
              <div style={{
                height: '6px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '3px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${stat.utilisationPct}%`,
                  height: '100%',
                  background: stat.utilisationPct >= 50 ? '#10B981' :
                    stat.utilisationPct >= 20 ? '#F59E0B' : '#EF4444',
                  borderRadius: '3px'
                }} />
              </div>
            </div>

            {/* Percentage */}
            <div style={{
              width: '45px',
              textAlign: 'right',
              fontSize: '13px',
              fontWeight: 600,
              color: stat.utilisationPct >= 50 ? '#10B981' :
                stat.utilisationPct >= 20 ? '#F59E0B' : '#EF4444'
            }}>
              {stat.utilisationPct}%
            </div>

            {/* User Count */}
            <div style={{
              width: '60px',
              textAlign: 'right',
              fontSize: '11px',
              color: '#6B7280'
            }}>
              {stat.usersActuallyUsing}/{stat.usersWithAccess}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
