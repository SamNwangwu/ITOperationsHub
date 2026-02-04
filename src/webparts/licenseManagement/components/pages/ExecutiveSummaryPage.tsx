import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceDashboardData, IKpiSummary, IIssueCategory, IAlert, IMonthComparisonData, IDowngradeSummary } from '../../models/ILicenceData';
import { IInsight } from '../../services/InsightEngine';
import { KpiCard, InsightCard, AlertPanel, SavingsTracker, MonthComparison, ActionCenter } from '../ui';
import { SpendByTypeChart, SpendTrendChart, ISpendByTypeData, ISpendTrendData } from '../charts';
import { classifySkuWithPurchased, getSkuFriendlyName } from '../../utils/SkuClassifier';

export interface IExecutiveSummaryPageProps {
  data: ILicenceDashboardData;
  kpi: IKpiSummary;
  insights: IInsight[];
  executiveSummary: string;
  extractDate?: string;
  isDataStale?: boolean;
  // V3 Props
  alerts?: IAlert[];
  monthComparison?: IMonthComparisonData | null;
  issueCategories?: IIssueCategory[];
  downgradeSummaries?: IDowngradeSummary[];
  onNavigate?: (tab: string) => void;
}

/**
 * Executive Summary Page V3 - Command Center Design
 * Redesigned for actionable intelligence
 */
const ExecutiveSummaryPage: React.FC<IExecutiveSummaryPageProps> = ({
  data,
  kpi,
  insights,
  executiveSummary,
  extractDate,
  isDataStale,
  alerts = [],
  monthComparison,
  issueCategories = [],
  downgradeSummaries = [],
  onNavigate
}) => {
  // Helper to find pricing with fallback via SkuPartNumber
  const findPricing = (title: string, skuPartNumber: string) => {
    let priceInfo = data.pricing.find(p => p.Title === title);
    if (!priceInfo) {
      const friendlyName = getSkuFriendlyName(skuPartNumber);
      priceInfo = data.pricing.find(p => p.Title === friendlyName);
    }
    return priceInfo;
  };

  // Prepare chart data - paid SKUs only, sorted by spend
  const spendByTypeData: ISpendByTypeData[] = data.skus
    .filter(sku => !classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased).isExcludedFromAggregates)
    .map((sku, index) => {
      const pricing = findPricing(sku.Title, sku.SkuPartNumber);
      const monthlySpend = pricing ? sku.Assigned * pricing.MonthlyCostPerUser : 0;
      const colours = ['#E4007D', '#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8'];
      return {
        name: sku.Title,
        value: monthlySpend,
        color: colours[index % colours.length]
      };
    })
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value);

  // Generate trend data from snapshots
  const trendData: ISpendTrendData[] = data.snapshots.length > 0
    ? data.snapshots.slice(-6).map(s => ({
        date: new Date(s.SnapshotDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        spend: s.TotalUsers * 30,
        users: s.TotalUsers
      }))
    : [];

  // Calculate savings status for tracker (mock for now - would come from SharePoint list in full impl)
  const savingsIdentified = kpi.potentialAnnualSavings * 0.6;
  const savingsInProgress = kpi.potentialAnnualSavings * 0.2;
  const savingsRealised = kpi.potentialAnnualSavings * 0.2;

  // Alert counts
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

  const handleAlertClick = (alert: IAlert) => {
    if (alert.actionTarget && onNavigate) {
      onNavigate(alert.actionTarget);
    }
  };

  const handleActionClick = (actionType: string, actionData: unknown) => {
    if (onNavigate) {
      onNavigate('issues');
    }
  };

  return (
    <div className={styles.pageContent}>
      {/* Hero Savings Banner */}
      {kpi.potentialAnnualSavings > 0 && (
        <div style={{
          margin: '0 32px 24px',
          padding: '20px 28px',
          background: 'linear-gradient(135deg, rgba(228, 0, 125, 0.2) 0%, rgba(0, 40, 158, 0.2) 100%)',
          border: '1px solid rgba(228, 0, 125, 0.4)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '12px',
              background: 'rgba(228, 0, 125, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>{'\u00A3'}</span>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#E4007D', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                Potential Annual Savings
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: '#fff' }}>
                {'\u00A3'}{kpi.potentialAnnualSavings.toLocaleString()}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{kpi.issuesCount}</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Issues to resolve</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.2)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{kpi.overallUtilisationPct}%</div>
              <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Utilisation</div>
            </div>
            <button
              onClick={() => onNavigate?.('issues')}
              style={{
                padding: '12px 24px',
                background: '#E4007D',
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
              View Opportunities
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Licensed Users"
          value={kpi.totalLicensedUsers.toLocaleString()}
          color="purple"
          subtitle={`${kpi.activeUsersPct}% active`}
        />
        <KpiCard
          title="Monthly Spend"
          value={`\u00A3${Math.round(kpi.monthlySpend).toLocaleString()}`}
          color="blue"
          subtitle={`\u00A3${Math.round(kpi.annualSpend).toLocaleString()}/year`}
        />
        <KpiCard
          title="Utilisation"
          value={`${kpi.overallUtilisationPct}%`}
          color={kpi.overallUtilisationPct >= 80 ? 'green' : 'orange'}
          subtitle={`${kpi.totalAssignedLicences.toLocaleString()} of ${kpi.totalPurchasedLicences.toLocaleString()}`}
        />
        <KpiCard
          title="Issues"
          value={kpi.issuesCount.toString()}
          color={kpi.issuesCount > 0 ? (criticalAlerts > 0 ? 'red' : 'orange') : 'green'}
          subtitle={criticalAlerts > 0 ? `${criticalAlerts} critical` : 'Review needed'}
        />
      </div>

      {/* Data Timestamp */}
      {extractDate && (
        <div style={{
          padding: '8px 32px',
          fontSize: '12px',
          color: isDataStale ? '#F59E0B' : '#6B7280',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: isDataStale ? '#F59E0B' : '#10B981'
          }} />
          Data extracted: {extractDate}
          {isDataStale && <span style={{ marginLeft: '8px' }}> - Data may be outdated</span>}
        </div>
      )}

      {/* Two Column Layout: Alerts + Actions | Charts + Insights */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '24px',
        padding: '0 32px 24px'
      }}>
        {/* Left Column: Alerts & Action Center */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Alerts Panel */}
          {alerts.length > 0 && (
            <div>
              <div style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#fff',
                marginBottom: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Alerts
                <span style={{
                  padding: '2px 8px',
                  background: criticalAlerts > 0 ? '#EF4444' : '#F59E0B',
                  borderRadius: '10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#fff'
                }}>
                  {alerts.length}
                </span>
              </div>
              <AlertPanel
                alerts={alerts}
                maxVisible={4}
                compact={true}
                onAlertClick={handleAlertClick}
              />
            </div>
          )}

          {/* Action Center */}
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4007D" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Quick Actions
            </div>
            <ActionCenter
              issueCategories={issueCategories}
              downgradeSummaries={downgradeSummaries}
              onActionClick={handleActionClick}
            />
          </div>
        </div>

        {/* Right Column: Charts & Comparison */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Spend by Type */}
          <SpendByTypeChart data={spendByTypeData} />

          {/* Month Comparison or Trend */}
          {monthComparison ? (
            <MonthComparison data={monthComparison} compact={true} />
          ) : trendData.length > 0 ? (
            <SpendTrendChart data={trendData} showUsers={true} />
          ) : (
            <div style={{
              background: '#111827',
              border: '1px solid #1F2937',
              borderRadius: '12px',
              padding: '20px',
              textAlign: 'center',
              color: '#6B7280'
            }}>
              <div style={{ marginBottom: '8px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                Monthly Trend
              </div>
              Trend data will appear after multiple extraction runs.
            </div>
          )}
        </div>
      </div>

      {/* Executive Summary */}
      <div className={styles.executiveSummary}>
        <div className={styles.summaryText}>{executiveSummary}</div>
      </div>

      {/* Key Insights */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Key Insights</div>
      </div>
      <div className={styles.insightsGrid}>
        {insights.slice(0, 4).map(insight => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </div>
    </div>
  );
};

export default ExecutiveSummaryPage;
