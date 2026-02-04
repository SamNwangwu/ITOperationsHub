import * as React from 'react';
import styles from './LicenseManagement.module.scss';
import { ILicenseManagementProps } from './ILicenseManagementProps';
import { SharePointDataService } from '../services/SharePointDataService';
import { InsightEngine, IInsight } from '../services/InsightEngine';
import { AlertService } from '../services/AlertService';
import { ComparisonService } from '../services/ComparisonService';
import { DowngradeEngine } from '../services/DowngradeEngine';
import {
  ILicenceDashboardData,
  IKpiSummary,
  ILicenceUser,
  IIssueCategory,
  IAlert,
  IMonthComparisonData,
  IDowngradeSummary
} from '../models/ILicenceData';
import { KpiCard, IssueCard, DataTable, IDataTableColumn } from './ui';
import { ExecutiveSummaryPage, CostAnalysisPage, UserDetailPage } from './pages';
import { UtilisationGauge } from './charts';
import { getTierLabel, getTierColour, classifySkuWithPurchased } from '../utils/SkuClassifier';

type TabType = 'summary' | 'costs' | 'utilisation' | 'issues' | 'users';
type IssueFilterType = 'all' | 'Disabled' | 'Dual-Licensed' | 'Inactive 90+' | 'Service Account';

interface ILicenseManagementState {
  data: ILicenceDashboardData | null;
  kpi: IKpiSummary | null;
  insights: IInsight[];
  issueCategories: IIssueCategory[];
  loading: boolean;
  error: string;
  extractDate: string;
  isDataStale: boolean;
  activeTab: TabType;
  issueFilter: IssueFilterType;
  searchText: string;
  selectedUserIds: Set<number>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  selectedUser: ILicenceUser | null;
  allSkusExpanded: boolean;
  departmentFilter: string;
  // V3 State
  alerts: IAlert[];
  monthComparison: IMonthComparisonData | null;
  downgradeSummaries: IDowngradeSummary[];
}

/**
 * Lebara M365 Licence Intelligence V3
 * Command Center Dashboard with Actionable Intelligence
 *
 * V3 Features:
 * - Alert system with proactive notifications
 * - Month-over-month comparison
 * - Downgrade recommendations
 * - Accurate issue-type-aware costing
 *
 * Data flows from SharePoint lists populated by Get-LicenseIntelligence.ps1
 */
export default class LicenseManagement extends React.Component<ILicenseManagementProps, ILicenseManagementState> {
  private dataService: SharePointDataService;
  private insightEngine: InsightEngine;
  private alertService: AlertService;
  private comparisonService: ComparisonService;
  private downgradeEngine: DowngradeEngine;

  constructor(props: ILicenseManagementProps) {
    super(props);

    this.dataService = new SharePointDataService(props.context);
    this.insightEngine = new InsightEngine();
    this.alertService = new AlertService();
    this.comparisonService = new ComparisonService();
    this.downgradeEngine = new DowngradeEngine();

    this.state = {
      data: null,
      kpi: null,
      insights: [],
      issueCategories: [],
      loading: true,
      error: '',
      extractDate: '-',
      isDataStale: false,
      activeTab: 'summary',
      issueFilter: 'all',
      searchText: '',
      selectedUserIds: new Set(),
      sortField: 'Title',
      sortDirection: 'asc',
      selectedUser: null,
      allSkusExpanded: false,
      departmentFilter: 'all',
      // V3 State
      alerts: [],
      monthComparison: null,
      downgradeSummaries: []
    };
  }

  public componentDidMount(): void {
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    this.setState({ loading: true, error: '' });

    try {
      const data = await this.dataService.loadDashboardData();
      const kpi = this.dataService.calculateKpiSummary(data);
      const insights = this.insightEngine.generateInsights(data, kpi);
      const issueCategories = this.dataService.getIssueCategories(data);

      // V3: Initialize downgrade engine with pricing data
      this.downgradeEngine.initialise(data.pricing, data.skus);

      // V3: Generate downgrade recommendations
      const downgradeRecommendations = this.downgradeEngine.generateDowngradeRecommendations(data.users);
      const downgradeSummaries = this.downgradeEngine.summariseDowngrades(downgradeRecommendations);

      // V3: Generate alerts
      const alerts = this.alertService.generateAlerts(data, kpi, downgradeRecommendations);

      // V3: Generate month-over-month comparison
      const monthComparison = this.comparisonService.generateMonthComparison(data.snapshots);

      // Get ExtractDate from the first user or sku record
      const extractDateStr = data.users.length > 0
        ? data.users[0].ExtractDate
        : data.skus.length > 0
          ? data.skus[0].ExtractDate
          : null;

      // Calculate if data is stale (>24 hours old)
      let extractDate = '-';
      let isDataStale = false;
      if (extractDateStr) {
        const extractDateObj = new Date(extractDateStr);
        const hoursSinceExtract = (Date.now() - extractDateObj.getTime()) / (1000 * 60 * 60);
        isDataStale = hoursSinceExtract > 24;
        extractDate = extractDateObj.toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
      }

      this.setState({
        data,
        kpi,
        insights,
        issueCategories,
        loading: false,
        extractDate,
        isDataStale,
        // V3 State
        alerts,
        monthComparison,
        downgradeSummaries
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState({
        loading: false,
        error: `Failed to load data: ${errorMessage}. Make sure the SharePoint lists exist and have been populated by the PowerShell script.`
      });
    }
  }

  private onTabChange = (tab: TabType): void => {
    this.setState({ activeTab: tab, selectedUserIds: new Set(), selectedUser: null });
  }

  private onIssueFilterChange = (filter: IssueFilterType): void => {
    this.setState({ issueFilter: filter, selectedUserIds: new Set() });
  }

  private onSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ searchText: e.target.value });
  }

  private onSelectionChange = (ids: Set<number>): void => {
    this.setState({ selectedUserIds: ids });
  }

  private onSort = (field: string, direction: 'asc' | 'desc'): void => {
    this.setState({ sortField: field, sortDirection: direction });
  }

  private onUserClick = (user: ILicenceUser): void => {
    this.setState({ selectedUser: user });
  }

  private onBackFromUserDetail = (): void => {
    this.setState({ selectedUser: null });
  }

  private onToggleAllSkus = (): void => {
    this.setState(prev => ({ allSkusExpanded: !prev.allSkusExpanded }));
  }

  private onDepartmentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ departmentFilter: e.target.value });
  }

  private getFilteredUsers(): ILicenceUser[] {
    const { data, issueFilter, searchText, sortField, sortDirection } = this.state;
    if (!data) return [];

    let filtered = this.dataService.filterUsers(
      data.users,
      searchText,
      undefined,
      issueFilter === 'all' ? undefined : issueFilter
    );

    // Sort
    filtered = [...filtered].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortField] || '';
      const bVal = (b as unknown as Record<string, unknown>)[sortField] || '';

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        const result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
        return sortDirection === 'asc' ? result : -result;
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return 0;
    });

    return filtered;
  }

  private exportToCSV = (): void => {
    const { data, selectedUserIds } = this.state;
    if (!data) return;

    const filtered = this.getFilteredUsers();
    const toExport = selectedUserIds.size > 0
      ? filtered.filter(u => selectedUserIds.has(u.Id))
      : filtered;

    const headers = ['Display Name', 'Email', 'Department', 'Job Title', 'Licences', 'Status', 'Issue Type', 'Last Sign-In', 'Days Since Sign-In'];
    const rows = toExport.map(u => [
      u.Title,
      u.UserPrincipalName,
      u.Department,
      u.JobTitle,
      u.Licences,
      u.AccountEnabled ? 'Active' : 'Disabled',
      u.IssueType,
      u.LastSignInDate || 'Never',
      u.DaysSinceSignIn.toString()
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `licence-audit-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  private renderHeader(): React.ReactElement {
    const { extractDate, isDataStale } = this.state;

    return (
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div className={styles.logoText}>Licence Intelligence</div>
            <div className={styles.logoSubtitle}>Microsoft 365 Estate</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.lastSync}>
            <span className={`${styles.syncDot} ${isDataStale ? styles.syncDotStale : ''}`}></span>
            Last extract: {extractDate}
          </span>
          <button className={styles.btn} onClick={this.exportToCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
        </div>
      </div>
    );
  }

  private renderNavTabs(): React.ReactElement {
    const { activeTab } = this.state;
    const tabs: { key: TabType; label: string }[] = [
      { key: 'summary', label: 'Executive Summary' },
      { key: 'costs', label: 'Cost Analysis' },
      { key: 'utilisation', label: 'Utilisation & Adoption' },
      { key: 'issues', label: 'Issues & Optimisation' },
      { key: 'users', label: 'All Users' }
    ];

    return (
      <div className={styles.dashboardNav}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            className={`${styles.navTab} ${activeTab === tab.key ? styles.active : ''}`}
            onClick={() => this.onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  private renderSummaryTab(): React.ReactElement {
    const { data, kpi, insights, extractDate, isDataStale, alerts, monthComparison, issueCategories, downgradeSummaries } = this.state;
    if (!data || !kpi) return <></>;

    const executiveSummary = this.insightEngine.generateExecutiveSummary(data, kpi);

    return (
      <ExecutiveSummaryPage
        data={data}
        kpi={kpi}
        insights={insights}
        executiveSummary={executiveSummary}
        extractDate={extractDate}
        isDataStale={isDataStale}
        // V3 Props
        alerts={alerts}
        monthComparison={monthComparison}
        issueCategories={issueCategories}
        downgradeSummaries={downgradeSummaries}
        onNavigate={(tab) => this.onTabChange(tab as TabType)}
      />
    );
  }

  private renderCostsTab(): React.ReactElement {
    const { data, kpi } = this.state;
    if (!data || !kpi) return <></>;

    return (
      <CostAnalysisPage data={data} kpi={kpi} />
    );
  }

  private renderUtilisationTab(): React.ReactElement {
    const { data, kpi, allSkusExpanded } = this.state;
    if (!data || !kpi) return <></>;

    // Get categorised SKUs
    const attentionSkus = this.dataService.getAttentionSkus(data.skus);
    const corePaidSkus = this.dataService.getCorePaidSkus(data.skus);
    const paidSkus = this.dataService.getPaidSkus(data.skus);

    // All SKUs classified (for collapsible table - includes viral/free dimmed)
    const allSkusClassified = data.skus.map(sku => ({
      ...sku,
      classification: classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased)
    }));

    const hasAttentionItems =
      attentionSkus.overAllocated.length > 0 ||
      attentionSkus.nearCapacity.length > 0 ||
      attentionSkus.underUtilised.length > 0;

    return (
      <div className={styles.pageContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>Utilisation & Adoption</div>
          <div className={styles.pageSubtitle}>
            Licence utilisation across SKUs and user adoption metrics
          </div>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <KpiCard
            title="Overall Utilisation"
            value={`${kpi.overallUtilisationPct}%`}
            color={kpi.overallUtilisationPct >= 80 ? 'green' : 'orange'}
            subtitle="Across paid SKUs"
          />
          <KpiCard
            title="Active Users"
            value={`${kpi.activeUsersPct}%`}
            color={kpi.activeUsersPct >= 80 ? 'green' : 'orange'}
            subtitle={`${kpi.activeUsersCount} of ${kpi.totalLicensedUsers}`}
          />
          <KpiCard
            title="Inactive 90+ Days"
            value={kpi.inactiveCount.toString()}
            color={kpi.inactiveCount > 0 ? 'orange' : 'green'}
            subtitle="Potential optimisation"
          />
          <KpiCard
            title="Available Licences"
            value={(kpi.totalPurchasedLicences - kpi.totalAssignedLicences).toString()}
            color="blue"
            subtitle="Unassigned capacity"
          />
        </div>

        {/* Section 1: Attention Required Table */}
        {hasAttentionItems && (
          <>
            <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
              <div className={styles.sectionTitle}>Attention Required</div>
            </div>
            <div style={{ padding: '0 32px 24px' }}>
              <table className={styles.dataTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>SKU</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Tier</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Assigned</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Purchased</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Utilisation</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attentionSkus.overAllocated.map((sku, index) => (
                    <tr key={`over-${sku.Id}`} style={{
                      background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 500 }}>
                        {sku.Title}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: getTierColour(sku.classification.tier),
                          color: '#fff'
                        }}>
                          {getTierLabel(sku.classification.tier)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Assigned.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Purchased.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right', color: '#EF4444', fontWeight: 600 }}>
                        {sku.UtilisationPct}%
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#EF4444',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                          Over-allocated (+{sku.Assigned - sku.Purchased})
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attentionSkus.nearCapacity.map((sku, index) => (
                    <tr key={`near-${sku.Id}`} style={{
                      background: (attentionSkus.overAllocated.length + index) % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 500 }}>
                        {sku.Title}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: getTierColour(sku.classification.tier),
                          color: '#fff'
                        }}>
                          {getTierLabel(sku.classification.tier)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Assigned.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Purchased.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right', color: '#F59E0B', fontWeight: 600 }}>
                        {sku.UtilisationPct}%
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#F59E0B',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="8" x2="12" y2="12"/>
                            <line x1="12" y1="16" x2="12.01" y2="16"/>
                          </svg>
                          Near capacity ({sku.Purchased - sku.Assigned} left)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {attentionSkus.underUtilised.map((sku, index) => (
                    <tr key={`under-${sku.Id}`} style={{
                      background: (attentionSkus.overAllocated.length + attentionSkus.nearCapacity.length + index) % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'
                    }}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', fontWeight: 500 }}>
                        {sku.Title}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          background: getTierColour(sku.classification.tier),
                          color: '#fff'
                        }}>
                          {getTierLabel(sku.classification.tier)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Assigned.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                        {sku.Purchased.toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right', color: '#6B7280', fontWeight: 600 }}>
                        {sku.UtilisationPct}%
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: 'rgba(107, 114, 128, 0.15)',
                          color: '#9CA3AF',
                          fontSize: '12px',
                          fontWeight: 500
                        }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                          </svg>
                          Under-utilised ({sku.Purchased - sku.Assigned} unused)
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Section 2: Core Paid Licence Gauges */}
        <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
          <div className={styles.sectionTitle}>Core Licence Utilisation</div>
        </div>
        {corePaidSkus.length > 0 ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            padding: '0 32px 24px'
          }}>
            {corePaidSkus.map(sku => (
              <UtilisationGauge
                key={sku.Id}
                value={sku.UtilisationPct}
                title={sku.Title}
                subtitle={`${sku.Assigned.toLocaleString()} of ${sku.Purchased.toLocaleString()}`}
              />
            ))}
          </div>
        ) : (
          <div style={{
            padding: '24px 32px',
            color: '#6B7280',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            No core paid SKUs found in the licence data.
          </div>
        )}

        {/* Section 3: Collapsible All Licences Table */}
        <div style={{ padding: '0 32px 24px' }}>
          <button
            onClick={this.onToggleAllSkus}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: allSkusExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s'
              }}
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            All Licences ({allSkusClassified.length} total - {paidSkus.length} paid)
          </button>

          {allSkusExpanded && (
            <div style={{ marginTop: '16px', overflowX: 'auto' }}>
              <table className={styles.dataTable} style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>SKU</th>
                    <th style={{ textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Tier</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Assigned</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Purchased</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Available</th>
                    <th style={{ textAlign: 'right', padding: '12px 16px', borderBottom: '1px solid #374151', color: '#9CA3AF' }}>Utilisation</th>
                  </tr>
                </thead>
                <tbody>
                  {allSkusClassified.map((sku, index) => {
                    const available = sku.Purchased - sku.Assigned;
                    let utilisationColor = '#10B981'; // green
                    if (sku.UtilisationPct >= 100) utilisationColor = '#EF4444'; // red
                    else if (sku.UtilisationPct >= 90) utilisationColor = '#F59E0B'; // amber
                    else if (sku.UtilisationPct < 50) utilisationColor = '#6B7280'; // grey

                    return (
                      <tr key={sku.Id} style={{
                        background: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                        opacity: sku.classification.isExcludedFromAggregates ? 0.5 : 1
                      }}>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                          <div style={{ fontWeight: 500 }}>{sku.Title}</div>
                          <div style={{ fontSize: '11px', color: '#6B7280' }}>{sku.SkuPartNumber}</div>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            background: getTierColour(sku.classification.tier),
                            color: '#fff'
                          }}>
                            {getTierLabel(sku.classification.tier)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                          {sku.Assigned.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                          {sku.Purchased.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right', color: available < 0 ? '#EF4444' : '#9CA3AF' }}>
                          {available.toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 16px', borderBottom: '1px solid #1F2937', textAlign: 'right' }}>
                          <span style={{ color: utilisationColor, fontWeight: 600 }}>
                            {sku.UtilisationPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  private renderIssuesTab(): React.ReactElement {
    const { data, issueCategories, issueFilter, kpi } = this.state;
    const filteredUsers = this.getFilteredUsers();

    const columns: IDataTableColumn[] = [
      { key: 'user', header: 'User', sortable: true },
      { key: 'licences', header: 'Licences' },
      { key: 'status', header: 'Status' },
      { key: 'issueType', header: 'Issue Type' },
      { key: 'lastSignIn', header: 'Last Sign-In', sortable: true },
      { key: 'department', header: 'Department', sortable: true }
    ];

    const totalIssues = issueCategories.reduce((sum, c) => sum + c.count, 0);
    const totalSavings = issueCategories.reduce((sum, c) => sum + c.potentialSavings, 0);

    return (
      <div className={styles.pageContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>Issues & Optimisation</div>
          <div className={styles.pageSubtitle}>
            Identify and remediate licence waste to unlock cost savings
          </div>
        </div>

        {/* Summary Banner */}
        {totalIssues > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '16px 24px',
            margin: '0 32px 24px',
            background: 'linear-gradient(135deg, rgba(228, 0, 125, 0.1), rgba(0, 40, 158, 0.1))',
            borderRadius: '12px',
            border: '1px solid rgba(228, 0, 125, 0.2)'
          }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#E4007D' }}>
                {totalIssues}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Total Issues</div>
            </div>
            <div style={{ width: '1px', height: '40px', background: '#374151' }} />
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#10B981' }}>
                {'\u00A3'}{Math.round(totalSavings).toLocaleString()}
              </div>
              <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Annual Savings Opportunity</div>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ fontSize: '13px', color: '#9CA3AF', maxWidth: '300px' }}>
              Click a category below to filter the user list and review accounts for remediation.
            </div>
          </div>
        )}

        {/* Issue Category Cards */}
        <div className={styles.issuesGrid} style={{ padding: '0 32px 24px' }}>
          {issueCategories.map(issue => (
            <IssueCard
              key={issue.type}
              issue={issue}
              isActive={issueFilter === issue.type}
              onClick={() => this.onIssueFilterChange(issue.type)}
            />
          ))}
        </div>

        {/* Users Table */}
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              {issueFilter === 'all' ? 'All Users with Issues' : `${issueFilter} Users`}
              {' '}({filteredUsers.length})
            </div>
            <div className={styles.tableActions}>
              <input
                type="text"
                className={styles.searchBox}
                placeholder="Search users..."
                value={this.state.searchText}
                onChange={this.onSearchChange}
              />
              <select
                className={styles.filterDropdown}
                value={issueFilter}
                onChange={(e) => this.onIssueFilterChange(e.target.value as IssueFilterType)}
              >
                <option value="all">All Issues</option>
                <option value="Disabled">Disabled</option>
                <option value="Dual-Licensed">Dual-Licensed</option>
                <option value="Inactive 90+">Inactive 90+</option>
                <option value="Service Account">Service Account</option>
              </select>
            </div>
          </div>
          <DataTable
            users={filteredUsers}
            columns={columns}
            selectedIds={this.state.selectedUserIds}
            onSelectionChange={this.onSelectionChange}
            onSort={this.onSort}
            sortField={this.state.sortField}
            sortDirection={this.state.sortDirection}
            emptyMessage="No users match the selected filters"
            onRowClick={this.onUserClick}
          />
        </div>
      </div>
    );
  }

  private renderUsersTab(): React.ReactElement {
    const { data, departmentFilter } = this.state;
    if (!data) return <></>;

    // Get unique departments for filter dropdown
    const departments = this.dataService.getDepartments(data.users);

    // Get all users filtered by search and department
    const allUsers = this.dataService.filterUsers(
      data.users,
      this.state.searchText,
      departmentFilter === 'all' ? undefined : departmentFilter,
      undefined
    );

    const columns: IDataTableColumn[] = [
      { key: 'user', header: 'User', sortable: true },
      { key: 'department', header: 'Department', sortable: true },
      { key: 'jobTitle', header: 'Job Title' },
      { key: 'licences', header: 'Licences' },
      { key: 'status', header: 'Status' },
      { key: 'lastSignIn', header: 'Last Sign-In', sortable: true }
    ];

    return (
      <div className={styles.pageContent}>
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageTitle}>All Users</div>
          <div className={styles.pageSubtitle}>
            Complete list of all licensed users across the organisation
          </div>
        </div>

        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              Licensed Users ({allUsers.length})
              {departmentFilter !== 'all' && (
                <span style={{ fontWeight: 400, color: '#9CA3AF' }}> in {departmentFilter}</span>
              )}
            </div>
            <div className={styles.tableActions}>
              <input
                type="text"
                className={styles.searchBox}
                placeholder="Search by name, email, or dept..."
                value={this.state.searchText}
                onChange={this.onSearchChange}
              />
              <select
                className={styles.filterDropdown}
                value={departmentFilter}
                onChange={this.onDepartmentFilterChange}
              >
                <option value="all">All Departments ({data.users.length})</option>
                {departments.map(dept => {
                  const count = data.users.filter(u => u.Department === dept).length;
                  return (
                    <option key={dept} value={dept}>{dept} ({count})</option>
                  );
                })}
              </select>
            </div>
          </div>
          <DataTable
            users={allUsers}
            columns={columns}
            selectedIds={this.state.selectedUserIds}
            onSelectionChange={this.onSelectionChange}
            onSort={this.onSort}
            sortField={this.state.sortField}
            sortDirection={this.state.sortDirection}
            onRowClick={this.onUserClick}
          />
        </div>
      </div>
    );
  }

  private renderUserDetail(): React.ReactElement {
    const { data, selectedUser } = this.state;
    if (!data || !selectedUser) return <></>;

    return (
      <UserDetailPage
        user={selectedUser}
        skus={data.skus}
        pricing={data.pricing}
        usage={data.usage}
        onBack={this.onBackFromUserDetail}
      />
    );
  }

  private renderContent(): React.ReactElement {
    const { activeTab, selectedUser } = this.state;

    // If a user is selected, show user detail page
    if (selectedUser) {
      return this.renderUserDetail();
    }

    switch (activeTab) {
      case 'summary':
        return this.renderSummaryTab();
      case 'costs':
        return this.renderCostsTab();
      case 'utilisation':
        return this.renderUtilisationTab();
      case 'issues':
        return this.renderIssuesTab();
      case 'users':
        return this.renderUsersTab();
      default:
        return this.renderSummaryTab();
    }
  }

  public render(): React.ReactElement<ILicenseManagementProps> {
    const { loading, error, selectedUser } = this.state;

    return (
      <div className={styles.licenseManagement}>
        {this.renderHeader()}

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <span>Loading licence data from SharePoint...</span>
          </div>
        ) : (
          <>
            {!selectedUser && this.renderNavTabs()}
            {this.renderContent()}
          </>
        )}
      </div>
    );
  }
}
