import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceDashboardData, IKpiSummary } from '../../models/ILicenceData';
import { KpiCard, SkuCard } from '../ui';
import { SpendByTypeChart, SpendTrendChart, UtilisationGauge, ISpendByTypeData, ISpendTrendData } from '../charts';

export interface ICostAnalysisPageProps {
  data: ILicenceDashboardData;
  kpi: IKpiSummary;
}

/**
 * Cost Analysis Page - Detailed cost breakdown and trends
 */
const CostAnalysisPage: React.FC<ICostAnalysisPageProps> = ({
  data,
  kpi
}) => {
  // Prepare spend by type data
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

  // Generate trend data from snapshots
  const trendData: ISpendTrendData[] = data.snapshots.length > 0
    ? data.snapshots.slice(-12).map(s => ({
        date: new Date(s.SnapshotDate).toLocaleDateString('en-GB', { month: 'short' }),
        spend: s.TotalUsers * 30,
        users: s.TotalUsers
      }))
    : [
        { date: 'Jul', spend: kpi.monthlySpend * 0.90, users: kpi.totalLicensedUsers - 50 },
        { date: 'Aug', spend: kpi.monthlySpend * 0.92, users: kpi.totalLicensedUsers - 40 },
        { date: 'Sep', spend: kpi.monthlySpend * 0.95, users: kpi.totalLicensedUsers - 30 },
        { date: 'Oct', spend: kpi.monthlySpend * 0.96, users: kpi.totalLicensedUsers - 20 },
        { date: 'Nov', spend: kpi.monthlySpend * 0.98, users: kpi.totalLicensedUsers - 10 },
        { date: 'Dec', spend: kpi.monthlySpend, users: kpi.totalLicensedUsers }
      ];

  // Calculate cost metrics
  const costPerUser = kpi.totalLicensedUsers > 0
    ? Math.round(kpi.monthlySpend / kpi.totalLicensedUsers)
    : 0;

  const wastedSpend = kpi.potentialMonthlySavings;
  const effectiveSpend = kpi.monthlySpend - wastedSpend;

  return (
    <div className={styles.pageContent}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Cost Analysis</div>
        <div className={styles.pageSubtitle}>
          Detailed breakdown of licence spend and optimisation opportunities
        </div>
      </div>

      {/* Cost Summary Cards */}
      <div className={styles.costSummaryCards}>
        <div className={styles.costCard}>
          <div className={styles.costCardValue}>
            {'\u00A3'}{kpi.monthlySpend.toLocaleString()}
          </div>
          <div className={styles.costCardLabel}>Monthly Spend</div>
          <div className={styles.costCardSubtext}>
            {'\u00A3'}{kpi.annualSpend.toLocaleString()} annually
          </div>
        </div>
        <div className={styles.costCard}>
          <div className={styles.costCardValue} style={{ color: '#10B981' }}>
            {'\u00A3'}{effectiveSpend.toLocaleString()}
          </div>
          <div className={styles.costCardLabel}>Effective Spend</div>
          <div className={styles.costCardSubtext}>
            {Math.round((effectiveSpend / kpi.monthlySpend) * 100)}% utilised
          </div>
        </div>
        <div className={styles.costCard}>
          <div className={styles.costCardValue} style={{ color: '#EF4444' }}>
            {'\u00A3'}{wastedSpend.toLocaleString()}
          </div>
          <div className={styles.costCardLabel}>Potential Savings</div>
          <div className={styles.costCardSubtext}>
            {Math.round((wastedSpend / kpi.monthlySpend) * 100)}% recoverable
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Cost Per User"
          value={`\u00A3${costPerUser}`}
          color="blue"
          subtitle="Monthly average"
        />
        <KpiCard
          title="Total Purchased"
          value={kpi.totalPurchasedLicences.toLocaleString()}
          color="purple"
          subtitle="Across all SKUs"
        />
        <KpiCard
          title="Total Assigned"
          value={kpi.totalAssignedLicences.toLocaleString()}
          color="green"
          subtitle="Currently in use"
        />
        <KpiCard
          title="Utilisation Rate"
          value={`${kpi.overallUtilisationPct}%`}
          color={kpi.overallUtilisationPct >= 80 ? 'green' : 'orange'}
          subtitle="Overall efficiency"
        />
      </div>

      {/* Charts */}
      <div className={styles.chartGrid}>
        <SpendByTypeChart data={spendByTypeData} title="Spend by Licence Type" />
        <SpendTrendChart data={trendData} title="Monthly Spend Trend" />
      </div>

      {/* Utilisation Gauges */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Utilisation by SKU</div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '16px',
        padding: '0 32px 24px'
      }}>
        {data.skus.map(sku => (
          <UtilisationGauge
            key={sku.Id}
            value={sku.UtilisationPct}
            title={sku.Title}
            subtitle={`${sku.Assigned} of ${sku.Purchased} assigned`}
          />
        ))}
      </div>

      {/* SKU Cards */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Licence SKUs ({data.skus.length})</div>
      </div>
      <div className={styles.skuGrid}>
        {data.skus.map(sku => {
          const pricing = data.pricing.find(p => p.Title === sku.Title);
          return (
            <SkuCard key={sku.Id} sku={sku} pricing={pricing} />
          );
        })}
      </div>
    </div>
  );
};

export default CostAnalysisPage;
