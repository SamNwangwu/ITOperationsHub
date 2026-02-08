import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { IUserUsageProfile, IUsageAnalysisSummary, IFeatureUsageStats, E5_EXCLUSIVE_FEATURES } from '../../models/ILicenceData';
import FeatureUsageCard, { FeatureUsageStatsCard } from '../ui/FeatureUsageCard';

export interface IUsageAnalysisPageProps {
  profiles: IUserUsageProfile[];
  summary: IUsageAnalysisSummary;
  featureStats: IFeatureUsageStats[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onExport?: () => void;
}

type FilterKey = 'all' | 'e5' | 'downgrade';
type SortKey = 'name-asc' | 'name-desc' | 'utilisation-asc' | 'utilisation-desc' | 'savings-desc' | 'savings-asc';

/**
 * Usage Analysis Page - V3 Feature
 * Shows E5 feature utilisation per user with downgrade recommendations
 */
const UsageAnalysisPage: React.FC<IUsageAnalysisPageProps> = ({
  profiles,
  summary,
  featureStats,
  isLoading = false,
  onRefresh,
  onExport
}) => {
  const [activeFilters, setActiveFilters] = React.useState<FilterKey[]>(['all']);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortBy, setSortBy] = React.useState<SortKey>('savings-desc');
  const [expandedUsers, setExpandedUsers] = React.useState<Set<number>>(new Set());

  const toggleFilter = (key: FilterKey): void => {
    setActiveFilters(prev => {
      if (key === 'all') {
        return ['all'];
      }
      const withoutAll = prev.filter(f => f !== 'all');
      if (withoutAll.indexOf(key) >= 0) {
        const next = withoutAll.filter(f => f !== key);
        return next.length === 0 ? ['all'] : next;
      }
      return [...withoutAll, key];
    });
  };

  const toggleExpanded = (userId: number): void => {
    setExpandedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  // Filter and sort profiles
  const filteredProfiles = React.useMemo(() => {
    let result = [...profiles];

    // Apply filters (multi-select)
    if (activeFilters.indexOf('all') < 0) {
      result = result.filter(p => {
        if (activeFilters.indexOf('e5') >= 0 && p.hasE5 === true) return true;
        if (activeFilters.indexOf('downgrade') >= 0 && p.canDowngrade === true) return true;
        return false;
      });
    }

    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p =>
        (p.displayName || '').toLowerCase().indexOf(term) >= 0 ||
        (p.userPrincipalName || '').toLowerCase().indexOf(term) >= 0 ||
        (p.department || '').toLowerCase().indexOf(term) >= 0
      );
    }

    // Apply sort
    switch (sortBy) {
      case 'name-asc':
        result.sort((a, b) => a.displayName.localeCompare(b.displayName));
        break;
      case 'name-desc':
        result.sort((a, b) => b.displayName.localeCompare(a.displayName));
        break;
      case 'utilisation-asc':
        result.sort((a, b) => a.e5UtilisationPct - b.e5UtilisationPct);
        break;
      case 'utilisation-desc':
        result.sort((a, b) => b.e5UtilisationPct - a.e5UtilisationPct);
        break;
      case 'savings-desc':
        result.sort((a, b) => b.potentialAnnualSavings - a.potentialAnnualSavings);
        break;
      case 'savings-asc':
        result.sort((a, b) => a.potentialAnnualSavings - b.potentialAnnualSavings);
        break;
    }

    return result;
  }, [profiles, activeFilters, searchTerm, sortBy]);

  const formatCurrency = (value: number): string => {
    if (value >= 1000000) {
      return `£${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `£${Math.round(value / 1000)}K`;
    }
    return `£${Math.round(value).toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <div>Analysing usage data...</div>
      </div>
    );
  }

  return (
    <div className={styles.pageContent} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '0 32px 24px',
        borderBottom: '1px solid #1F2937',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#fff',
              margin: 0
            }}>
              Usage Analysis
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6B7280',
              margin: '4px 0 0'
            }}>
              E5 feature utilisation and downgrade recommendations based on actual usage
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {onRefresh && (
              <button
                onClick={onRefresh}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#9CA3AF',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Refresh
              </button>
            )}
            {onExport && (
              <button
                onClick={onExport}
                style={{
                  padding: '10px 16px',
                  background: '#00289e',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Report
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '20px',
        padding: '0 32px 24px'
      }}>
        {/* Total Analysed */}
        <div style={{
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
            Users Analysed
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
            {summary.totalUsersAnalysed.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            {summary.e5UsersCount} with E5 licences
          </div>
        </div>

        {/* E5 Underutilised */}
        <div style={{
          background: '#111827',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '11px', color: '#EF4444', textTransform: 'uppercase', marginBottom: '8px' }}>
            E5 Underutilised
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#EF4444' }}>
            {summary.e5UnderutilisedCount}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            {summary.e5UnderutilisedPct}% of E5 users
          </div>
        </div>

        {/* Avg E5 Utilisation */}
        <div style={{
          background: '#111827',
          border: '1px solid #1F2937',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
            Avg E5 Utilisation
          </div>
          <div style={{
            fontSize: '28px',
            fontWeight: 700,
            color: summary.averageE5UtilisationPct >= 50 ? '#10B981' :
              summary.averageE5UtilisationPct >= 30 ? '#F59E0B' : '#EF4444'
          }}>
            {summary.averageE5UtilisationPct}%
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            of E5 features being used
          </div>
        </div>

        {/* Potential Savings */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 40, 158, 0.2) 0%, rgba(0, 40, 158, 0.2) 100%)',
          border: '1px solid rgba(0, 40, 158, 0.4)',
          borderRadius: '12px',
          padding: '20px'
        }}>
          <div style={{ fontSize: '11px', color: '#00289e', textTransform: 'uppercase', marginBottom: '8px' }}>
            Potential Savings
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
            {formatCurrency(summary.potentialAnnualSavings)}
          </div>
          <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
            {summary.downgradeRecommendations} users can downgrade
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: '24px',
        padding: '0 32px 24px',
        flex: 1,
        minHeight: 0
      }}>
        {/* Left Column - User List */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* Filters */}
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 14px',
                background: '#0d1a2d',
                border: '1px solid #1F2937',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                width: '200px'
              }}
            />

            {/* Multi-select Filter Chips */}
            <div className={styles.filterChipGroup}>
              {[
                { key: 'all' as FilterKey, label: 'All Users' },
                { key: 'e5' as FilterKey, label: 'E5 Only' },
                { key: 'downgrade' as FilterKey, label: 'Can Downgrade' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => toggleFilter(opt.key)}
                  className={`${styles.filterChip}${activeFilters.indexOf(opt.key) >= 0 ? ` ${styles.filterChipActive}` : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              style={{
                padding: '10px 14px',
                background: '#0d1a2d',
                border: '1px solid #1F2937',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer'
              }}
            >
              <option value="savings-desc">Savings High-Low</option>
              <option value="savings-asc">Savings Low-High</option>
              <option value="utilisation-asc">Utilisation Low-High</option>
              <option value="utilisation-desc">Utilisation High-Low</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>

            <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#6B7280' }}>
              Showing {filteredProfiles.length} of {profiles.length}
            </div>
          </div>

          {/* User Cards - Scrollable Container */}
          <div className={styles.scrollableTable}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '8px'
            }}>
              {filteredProfiles.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: '#6B7280',
                  background: '#111827',
                  borderRadius: '12px'
                }}>
                  No users match your criteria
                </div>
              ) : (
                filteredProfiles.map(profile => (
                  <div key={profile.userId}>
                    <FeatureUsageCard
                      profile={profile}
                    />
                    {/* Expandable Feature Usage for Downgrade Candidates */}
                    {profile.canDowngrade && profile.hasE5 && (
                      <div style={{ marginTop: '-1px' }}>
                        <button
                          onClick={() => toggleExpanded(profile.userId)}
                          style={{
                            width: '100%',
                            padding: '8px 20px',
                            background: '#0d1a2d',
                            border: '1px solid #1F2937',
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            color: '#9CA3AF',
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            style={{
                              transform: expandedUsers.has(profile.userId) ? 'rotate(180deg)' : 'none',
                              transition: 'transform 0.2s ease'
                            }}
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                          {expandedUsers.has(profile.userId) ? 'Hide' : 'Show'} E5 Feature Breakdown
                        </button>

                        {expandedUsers.has(profile.userId) && (
                          <div style={{
                            background: '#0d1a2d',
                            border: '1px solid #1F2937',
                            borderTop: 'none',
                            borderRadius: '0 0 12px 12px',
                            padding: '16px 20px',
                            marginTop: '-12px'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: '#6B7280',
                              textTransform: 'uppercase',
                              marginBottom: '12px',
                              fontWeight: 600
                            }}>
                              E5-Exclusive Feature Usage
                            </div>
                            <div className={styles.featureRow}>
                              {E5_EXCLUSIVE_FEATURES.map(feature => {
                                const isUsed = (profile.e5FeaturesUsed || []).indexOf(feature.name) >= 0;
                                return (
                                  <div
                                    key={feature.id}
                                    className={`${styles.featureItem} ${isUsed ? styles.featureUsed : styles.featureUnused}`}
                                  >
                                    {isUsed ? (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                                        <polyline points="20 6 9 17 4 12"/>
                                      </svg>
                                    ) : (
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18"/>
                                        <line x1="6" y1="6" x2="18" y2="18"/>
                                      </svg>
                                    )}
                                    <span style={{ fontSize: '11px' }}>
                                      {feature.name.length > 30 ? feature.name.slice(0, 28) + '...' : feature.name}
                                    </span>
                                    <span style={{
                                      fontSize: '9px',
                                      color: '#4B5563',
                                      marginLeft: 'auto'
                                    }}>
                                      {feature.category}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Feature Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
          {/* Feature Utilisation */}
          <FeatureUsageStatsCard stats={featureStats} />

          {/* Top Unused Features */}
          <div style={{
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '12px',
            padding: '16px 20px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '4px'
            }}>
              Most Underutilised Features
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '12px' }}>
              E5 features with lowest adoption
            </div>

            {summary.topUnusedFeatures.map((item, idx) => (
              <div
                key={item.feature}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 0',
                  borderBottom: idx < summary.topUnusedFeatures.length - 1 ? '1px solid #1F2937' : 'none'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#EF4444'
                  }}>
                    {idx + 1}
                  </div>
                  <span style={{ fontSize: '12px', color: '#fff' }}>
                    {item.feature.length > 25 ? item.feature.slice(0, 23) + '...' : item.feature}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: '#EF4444',
                  fontWeight: 600
                }}>
                  {item.pct}% unused
                </div>
              </div>
            ))}
          </div>

          {/* Department Breakdown */}
          <div style={{
            background: '#111827',
            border: '1px solid #1F2937',
            borderRadius: '12px',
            padding: '16px 20px'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '4px'
            }}>
              Department Breakdown
            </div>
            <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '12px' }}>
              E5 users and downgrade opportunities by department
            </div>

            {summary.departmentBreakdown.slice(0, 6).map((dept, idx) => (
              <div
                key={dept.department}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: idx < 5 ? '1px solid #1F2937' : 'none'
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#fff' }}>
                    {dept.department}
                  </div>
                  <div style={{ fontSize: '10px', color: '#6B7280' }}>
                    {dept.e5Users} E5 users • {dept.canDowngrade} can downgrade
                  </div>
                </div>
                {dept.savings > 0 && (
                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#10B981'
                  }}>
                    {formatCurrency(dept.savings)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalysisPage;
