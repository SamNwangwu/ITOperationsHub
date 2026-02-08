import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceDashboardData, IKpiSummary } from '../../models/ILicenceData';
import { SpendByTypeChart, SpendTrendChart, ISpendByTypeData, ISpendTrendData } from '../charts';
import { classifySkuWithPurchased, getSkuFriendlyName } from '../../utils/SkuClassifier';

export interface ICostAnalysisPageProps {
  data: ILicenceDashboardData;
  kpi: IKpiSummary;
}

interface ICostBreakdownRow {
  name: string;
  skuPartNumber: string;
  assigned: number;
  monthlyPerUser: number;
  monthlyTotal: number;
  annualTotal: number;
  percentOfSpend: number;
}

/**
 * Cost Analysis Page - Detailed cost breakdown and trends
 * Shows only paid SKUs with pricing data, sorted by annual spend
 */
const CostAnalysisPage: React.FC<ICostAnalysisPageProps> = ({
  data,
  kpi
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

  // Prepare cost breakdown data - paid SKUs only with pricing
  const costBreakdown: ICostBreakdownRow[] = data.skus
    .filter(sku => !classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned).isExcludedFromAggregates)
    .map(sku => {
      const pricing = findPricing(sku.Title, sku.SkuPartNumber);
      if (!pricing) return null;

      const monthlyTotal = sku.Assigned * pricing.MonthlyCostPerUser;
      const annualTotal = monthlyTotal * 12;

      return {
        name: sku.Title,
        skuPartNumber: sku.SkuPartNumber,
        assigned: sku.Assigned,
        monthlyPerUser: pricing.MonthlyCostPerUser,
        monthlyTotal,
        annualTotal,
        percentOfSpend: kpi.annualSpend > 0 ? Math.round((annualTotal / kpi.annualSpend) * 100) : 0
      };
    })
    .filter((row): row is ICostBreakdownRow => row !== null)
    .sort((a, b) => b.annualTotal - a.annualTotal);

  const skusWithPricing = costBreakdown.length;
  const totalSkus = data.skus.filter(s =>
    !classifySkuWithPurchased(s.SkuPartNumber, s.Purchased, s.Assigned).isExcludedFromAggregates
  ).length;

  // Prepare spend by type data for chart - top 5 + "Other"
  const topSkus = costBreakdown.slice(0, 5);
  const otherSpend = costBreakdown.slice(5).reduce((sum, row) => sum + row.monthlyTotal, 0);

  const colours = ['#00289e', '#00289e', '#00A4E4', '#10B981', '#F59E0B', '#818CF8'];
  const spendByTypeData: ISpendByTypeData[] = [
    ...topSkus.map((row, index) => ({
      name: row.name,
      value: row.monthlyTotal,
      color: colours[index]
    })),
    ...(otherSpend > 0 ? [{ name: 'Other', value: otherSpend, color: '#6B7280' }] : [])
  ];

  // Generate trend data from snapshots
  const trendData: ISpendTrendData[] = data.snapshots.length > 0
    ? data.snapshots.slice(-12).map(s => ({
        date: new Date(s.SnapshotDate).toLocaleDateString('en-GB', { month: 'short' }),
        spend: s.TotalUsers * 30,
        users: s.TotalUsers
      }))
    : []; // Empty array instead of fake data

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
          <div className={styles.costCardValue}>
            {'\u00A3'}{costPerUser}
          </div>
          <div className={styles.costCardLabel}>Cost Per User</div>
          <div className={styles.costCardSubtext}>
            Monthly average
          </div>
        </div>
        <div className={styles.costCard}>
          <div className={styles.costCardValue} style={{ color: '#10B981' }}>
            {'\u00A3'}{effectiveSpend.toLocaleString()}
          </div>
          <div className={styles.costCardLabel}>Effective Spend</div>
          <div className={styles.costCardSubtext}>
            {kpi.monthlySpend > 0 ? Math.round((effectiveSpend / kpi.monthlySpend) * 100) : 0}% utilised
          </div>
        </div>
        <div className={styles.costCard}>
          <div className={styles.costCardValue} style={{ color: '#EF4444' }}>
            {'\u00A3'}{wastedSpend.toLocaleString()}
          </div>
          <div className={styles.costCardLabel}>Potential Savings</div>
          <div className={styles.costCardSubtext}>
            {kpi.monthlySpend > 0 ? Math.round((wastedSpend / kpi.monthlySpend) * 100) : 0}% recoverable
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className={styles.chartGrid}>
        <SpendByTypeChart data={spendByTypeData} title="Spend by Licence Type" />
        {trendData.length > 0 ? (
          <SpendTrendChart data={trendData} title="Monthly Spend Trend" />
        ) : (
          <div className={styles.chartContainer}>
            <div className={styles.chartTitle}>Monthly Spend Trend</div>
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

      {/* Cost Breakdown Table */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Cost Breakdown by Licence</div>
      </div>

      {costBreakdown.length > 0 ? (
        <div style={{ padding: '0 32px 24px', overflowX: 'auto' }}>
          <table className={styles.dataTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Licence</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>SKU</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Assigned</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Monthly/User</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Monthly Total</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Annual Total</th>
                <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>% of Spend</th>
              </tr>
            </thead>
            <tbody>
              {costBreakdown.map((row, index) => (
                <tr key={row.skuPartNumber} style={{
                  background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                }}>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                    <span style={{ fontWeight: 500 }}>{row.name}</span>
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', color: '#6B7280', fontSize: '12px' }}>
                    {row.skuPartNumber}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                    {row.assigned.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                    {'\u00A3'}{row.monthlyPerUser.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                    {'\u00A3'}{row.monthlyTotal.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right', fontWeight: 500 }}>
                    {'\u00A3'}{row.annualTotal.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      minWidth: '50px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      background: row.percentOfSpend >= 20 ? 'rgba(0, 40, 158, 0.15)' : 'rgba(255,255,255,0.05)',
                      color: row.percentOfSpend >= 20 ? '#00289e' : '#9CA3AF'
                    }}>
                      {row.percentOfSpend}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {skusWithPricing < totalSkus && (
            <div style={{
              marginTop: '16px',
              padding: '12px 16px',
              background: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '8px',
              color: '#F59E0B',
              fontSize: '13px'
            }}>
              Showing {skusWithPricing} of {totalSkus} paid SKUs with pricing data.
              Run Set-LicencePricing.ps1 to populate costs for remaining SKUs.
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '32px',
          margin: '0 32px 24px',
          background: 'rgba(245, 158, 11, 0.1)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#F59E0B', fontSize: '16px', marginBottom: '8px' }}>
            No pricing data available
          </div>
          <div style={{ color: '#9CA3AF', fontSize: '14px' }}>
            Run Set-LicencePricing.ps1 to populate licence costs and enable cost analytics.
          </div>
        </div>
      )}
    </div>
  );
};

export default CostAnalysisPage;
