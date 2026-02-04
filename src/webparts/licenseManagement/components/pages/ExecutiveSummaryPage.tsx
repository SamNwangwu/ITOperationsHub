import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceDashboardData, IKpiSummary } from '../../models/ILicenceData';
import { IInsight } from '../../services/InsightEngine';
import { KpiCard, InsightCard, SavingsHero } from '../ui';
import { SpendByTypeChart, SpendTrendChart, ISpendByTypeData, ISpendTrendData } from '../charts';
import { classifySkuWithPurchased, getSkuFriendlyName } from '../../utils/SkuClassifier';

export interface IExecutiveSummaryPageProps {
  data: ILicenceDashboardData;
  kpi: IKpiSummary;
  insights: IInsight[];
  executiveSummary: string;
  extractDate?: string;
  isDataStale?: boolean;
}

/**
 * Executive Summary Page - Overview of licence estate
 * Sparse, punchy page for C-suite presentation
 */
const ExecutiveSummaryPage: React.FC<IExecutiveSummaryPageProps> = ({
  data,
  kpi,
  insights,
  executiveSummary,
  extractDate,
  isDataStale
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

  // Generate trend data from snapshots (empty array if no snapshots - shows empty state)
  const trendData: ISpendTrendData[] = data.snapshots.length > 0
    ? data.snapshots.slice(-6).map(s => ({
        date: new Date(s.SnapshotDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        spend: s.TotalUsers * 30, // Placeholder calculation - actual spend needs per-snapshot pricing
        users: s.TotalUsers
      }))
    : []; // Empty array - will show placeholder message

  return (
    <div className={styles.pageContent}>
      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Total Licensed Users"
          value={kpi.totalLicensedUsers.toLocaleString()}
          color="purple"
          subtitle={`${data.skus.length} licence types`}
        />
        <KpiCard
          title="Active Users"
          value={`${kpi.activeUsersPct}%`}
          color="green"
          subtitle={`${kpi.activeUsersCount.toLocaleString()} users`}
          trend={kpi.activeUsersPct >= 80
            ? { direction: 'stable', value: 'Healthy' }
            : { direction: 'down', value: 'Below target', isPositive: false }
          }
        />
        <KpiCard
          title="Potential Savings"
          value={`\u00A3${kpi.potentialAnnualSavings.toLocaleString()}`}
          color="green"
          subtitle="Annual opportunity"
        />
        <KpiCard
          title="Issues to Review"
          value={kpi.issuesCount.toString()}
          color={kpi.issuesCount > 0 ? 'orange' : 'green'}
          subtitle={kpi.issuesCount > 0 ? 'Action required' : 'All clear'}
        />
      </div>

      {/* Data Timestamp Banner */}
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

      {/* Savings Hero */}
      {kpi.potentialAnnualSavings > 0 && (
        <SavingsHero
          monthlyAmount={kpi.potentialMonthlySavings}
          annualAmount={kpi.potentialAnnualSavings}
          issueCount={kpi.issuesCount}
          monthlySpend={kpi.monthlySpend}
        />
      )}

      {/* Executive Summary */}
      <div className={styles.executiveSummary}>
        <div className={styles.summaryText}>{executiveSummary}</div>
      </div>

      {/* Charts Grid */}
      <div className={styles.chartGrid}>
        <SpendByTypeChart data={spendByTypeData} />
        {trendData.length > 0 ? (
          <SpendTrendChart data={trendData} showUsers={true} />
        ) : (
          <div className={styles.chartContainer}>
            <div className={styles.chartTitle}>Monthly Trend</div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#6B7280',
              fontSize: '14px'
            }}>
              Trend data will appear after multiple extraction runs.
            </div>
          </div>
        )}
      </div>

      {/* Insights Grid */}
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
