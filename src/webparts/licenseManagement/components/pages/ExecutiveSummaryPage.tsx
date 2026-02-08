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
  onNavigate?: (tab: string, filter?: string) => void;
}

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
    .filter(sku => !classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned).isExcludedFromAggregates)
    .map((sku, index) => {
      const pricing = findPricing(sku.Title, sku.SkuPartNumber);
      const monthlySpend = pricing ? sku.Assigned * pricing.MonthlyCostPerUser : 0;
      const colours = ['#00289e', '#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8'];
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
      if (actionType === 'issue') {
        const issue = actionData as IIssueCategory;
        onNavigate('issues', issue.type);
      } else {
        onNavigate('issues');
      }
    }
  };

  return (
    <div className={styles.pageContent}>
      {/* Hero Savings Banner */}
      {kpi.potentialAnnualSavings > 0 && (
        <div className={styles.summaryHeroBanner}>
          <div className={styles.summaryHeroLeft}>
            <div className={styles.summaryHeroIcon}>
              {'\u00A3'}
            </div>
            <div>
              <div className={styles.summaryHeroLabel}>
                Potential Annual Savings
              </div>
              <div className={styles.summaryHeroValue}>
                {'\u00A3'}{kpi.potentialAnnualSavings.toLocaleString()}
              </div>
            </div>
          </div>
          <div className={styles.summaryHeroRight}>
            <div className={styles.summaryHeroStat}>
              <div className={styles.summaryHeroStatValue}>{kpi.issuesCount}</div>
              <div className={styles.summaryHeroStatLabel}>Issues to resolve</div>
            </div>
            <div className={styles.summaryHeroDivider} />
            <div className={styles.summaryHeroStat}>
              <div className={styles.summaryHeroStatValue}>{kpi.overallUtilisationPct}%</div>
              <div className={styles.summaryHeroStatLabel}>Utilisation</div>
            </div>
            <button
              onClick={() => onNavigate?.('issues')}
              className={styles.summaryHeroBtn}
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
          color="blue"
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
        <div className={`${styles.summaryTimestamp} ${isDataStale ? styles.summaryTimestampStale : styles.summaryTimestampFresh}`}>
          <span className={`${styles.summaryTimestampDot} ${isDataStale ? styles.summaryTimestampDotStale : styles.summaryTimestampDotFresh}`} />
          Data extracted: {extractDate}
          {isDataStale && <span> - Data may be outdated</span>}
        </div>
      )}

      {/* Two Column Layout: Alerts + Actions | Charts + Insights */}
      <div className={styles.summaryTwoCol}>
        {/* Left Column: Alerts & Action Center */}
        <div className={styles.summaryColumn}>
          {/* Alerts Panel */}
          {alerts.length > 0 && (
            <div>
              <div className={styles.summarySubheading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                Alerts
                <span className={`${styles.summaryAlertBadge} ${criticalAlerts > 0 ? styles.summaryAlertBadgeCritical : styles.summaryAlertBadgeWarning}`}>
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
            <div className={styles.summarySubheading}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00289e" strokeWidth="2">
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
        <div className={styles.summaryColumn}>
          {/* Spend by Type */}
          <SpendByTypeChart data={spendByTypeData} />

          {/* Month Comparison or Trend */}
          {monthComparison ? (
            <MonthComparison data={monthComparison} compact={true} />
          ) : trendData.length > 0 ? (
            <SpendTrendChart data={trendData} showUsers={true} />
          ) : (
            <div className={styles.summaryTrendPlaceholder}>
              <div className={styles.summaryTrendTitle}>
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
