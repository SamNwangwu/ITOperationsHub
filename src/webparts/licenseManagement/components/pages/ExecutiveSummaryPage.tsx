import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceDashboardData, IKpiSummary, IIssueCategory } from '../../models/ILicenceData';
import { IInsight } from '../../services/InsightEngine';
import { KpiCard, InsightCard, IssueCard, SavingsHero } from '../ui';
import { SpendByTypeChart, SpendTrendChart, ISpendByTypeData, ISpendTrendData } from '../charts';

export interface IExecutiveSummaryPageProps {
  data: ILicenceDashboardData;
  kpi: IKpiSummary;
  insights: IInsight[];
  issueCategories: IIssueCategory[];
  executiveSummary: string;
  onIssueClick: (issueType: string) => void;
}

/**
 * Executive Summary Page - Overview of licence estate
 */
const ExecutiveSummaryPage: React.FC<IExecutiveSummaryPageProps> = ({
  data,
  kpi,
  insights,
  issueCategories,
  executiveSummary,
  onIssueClick
}) => {
  // Prepare chart data
  const spendByTypeData: ISpendByTypeData[] = data.skus.map((sku, index) => {
    const pricing = data.pricing.find(p => p.Title === sku.Title);
    const monthlySpend = pricing ? sku.Assigned * pricing.MonthlyCostPerUser : 0;
    const colours = ['#E4007D', '#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8'];
    return {
      name: sku.Title,
      value: monthlySpend,
      color: colours[index % colours.length]
    };
  }).filter(d => d.value > 0);

  // Generate trend data from snapshots (or use placeholder if no snapshots)
  const trendData: ISpendTrendData[] = data.snapshots.length > 0
    ? data.snapshots.slice(-6).map(s => ({
        date: new Date(s.SnapshotDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
        spend: s.TotalUsers * 30, // Placeholder calculation
        users: s.TotalUsers
      }))
    : [
        { date: 'Oct', spend: kpi.monthlySpend * 0.95, users: kpi.totalLicensedUsers - 20 },
        { date: 'Nov', spend: kpi.monthlySpend * 0.97, users: kpi.totalLicensedUsers - 10 },
        { date: 'Dec', spend: kpi.monthlySpend * 0.98, users: kpi.totalLicensedUsers - 5 },
        { date: 'Jan', spend: kpi.monthlySpend, users: kpi.totalLicensedUsers }
      ];

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
        <SpendTrendChart data={trendData} showUsers={true} />
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

      {/* Quick Issue Summary */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Licence Issues</div>
      </div>
      <div className={styles.issuesGrid} style={{ padding: '0 32px 24px' }}>
        {issueCategories.map(issue => (
          <IssueCard
            key={issue.type}
            issue={issue}
            onClick={() => onIssueClick(issue.type)}
          />
        ))}
      </div>
    </div>
  );
};

export default ExecutiveSummaryPage;
