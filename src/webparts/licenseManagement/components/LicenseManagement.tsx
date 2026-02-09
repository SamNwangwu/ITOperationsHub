import * as React from 'react';
import styles from './LicenseManagement.module.scss';
import { ILicenseManagementProps } from './ILicenseManagementProps';
import { SharePointDataService } from '../services/SharePointDataService';
import { InsightEngine, IInsight } from '../services/InsightEngine';
import { AlertService } from '../services/AlertService';
import { ComparisonService } from '../services/ComparisonService';
import { DowngradeEngine } from '../services/DowngradeEngine';
import { UsageReportService } from '../services/UsageReportService';
import {
  ILicenceDashboardData,
  IKpiSummary,
  ILicenceUser,
  IIssueCategory,
  IAlert,
  IMonthComparisonData,
  IDowngradeSummary,
  IUserUsageProfile,
  IUsageAnalysisSummary,
  IFeatureUsageStats
} from '../models/ILicenceData';
import { KpiCard, IssueCard, DataTable, IDataTableColumn } from './ui';
import { ExecutiveSummaryPage, CostAnalysisPage, UserDetailPage, UtilisationPage } from './pages';
import UsageAnalysisPage from './pages/UsageAnalysisPage';
import { FeedbackButton } from '../../../components/FeedbackButton/FeedbackButton';

type TabType = 'summary' | 'costs' | 'utilisation' | 'issues' | 'users' | 'usage';
type IssueFilterType = 'all' | 'Disabled' | 'Dual-Licensed' | 'Inactive 90+' | 'Service Account';
type IssueType = Exclude<IssueFilterType, 'all'>;

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
  issueFilters: IssueFilterType[];
  searchText: string;
  selectedUserIds: Set<number>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  selectedUser: ILicenceUser | null;
  departmentFilter: string;
  usersLicenceFilter: string;
  usersIssueFilters: IssueFilterType[];
  // V3 State
  alerts: IAlert[];
  monthComparison: IMonthComparisonData | null;
  downgradeSummaries: IDowngradeSummary[];
  // Usage Analysis State
  usageProfiles: IUserUsageProfile[];
  usageSummary: IUsageAnalysisSummary | null;
  usageFeatureStats: IFeatureUsageStats[];
  usageLoading: boolean;
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
  private usageReportService: UsageReportService;

  constructor(props: ILicenseManagementProps) {
    super(props);

    this.dataService = new SharePointDataService(props.context);
    this.insightEngine = new InsightEngine();
    this.alertService = new AlertService();
    this.comparisonService = new ComparisonService();
    this.downgradeEngine = new DowngradeEngine();
    this.usageReportService = new UsageReportService(props.context);

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
      issueFilters: ['all'],
      searchText: '',
      selectedUserIds: new Set(),
      sortField: 'Title',
      sortDirection: 'asc',
      selectedUser: null,
      departmentFilter: 'all',
      usersLicenceFilter: 'all',
      usersIssueFilters: ['all'],
      // V3 State
      alerts: [],
      monthComparison: null,
      downgradeSummaries: [],
      // Usage Analysis State
      usageProfiles: [],
      usageSummary: null,
      usageFeatureStats: [],
      usageLoading: false
    };
  }

  public componentDidMount(): void {
    void this.loadData();
  }

  /**
   * Load usage analysis data from Graph API
   * Called on-demand when user navigates to Usage Analysis tab
   */
  private async loadUsageData(): Promise<void> {
    const { data, usageProfiles } = this.state;
    if (!data || usageProfiles.length > 0) return; // Already loaded or no data

    this.setState({ usageLoading: true });

    try {
      // Initialize usage service with pricing data
      this.usageReportService.initialise(data.pricing);

      // Fetch M365 app usage from Graph API
      const appUsage = await this.usageReportService.getM365AppUsage('D30');

      // Generate user usage profiles
      const profiles = await this.usageReportService.generateUserUsageProfiles(data.users, appUsage);

      // Generate summary and stats
      const summary = this.usageReportService.generateUsageAnalysisSummary(profiles);
      const featureStats = this.usageReportService.generateFeatureUsageStats(profiles);

      this.setState({
        usageProfiles: profiles,
        usageSummary: summary,
        usageFeatureStats: featureStats,
        usageLoading: false
      });
    } catch (error) {
      console.error('Error loading usage data:', error);
      // Generate profiles from licence data only (without Graph API data)
      const profiles = await this.usageReportService.generateUserUsageProfiles(data.users, []);
      const summary = this.usageReportService.generateUsageAnalysisSummary(profiles);
      const featureStats = this.usageReportService.generateFeatureUsageStats(profiles);

      this.setState({
        usageProfiles: profiles,
        usageSummary: summary,
        usageFeatureStats: featureStats,
        usageLoading: false
      });
    }
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

    // Load usage data when navigating to usage tab
    if (tab === 'usage') {
      void this.loadUsageData();
    }
  }

  private toggleIssueFilter = (filter: IssueFilterType): void => {
    this.setState(prev => {
      if (filter === 'all') {
        return { issueFilters: ['all'] as IssueFilterType[], selectedUserIds: new Set<number>() };
      }
      const withoutAll = prev.issueFilters.filter(f => f !== 'all');
      const idx = withoutAll.indexOf(filter);
      let next: IssueFilterType[];
      if (idx >= 0) {
        next = withoutAll.filter(f => f !== filter);
        if (next.length === 0) next = ['all'];
      } else {
        next = [...withoutAll, filter];
      }
      return { issueFilters: next, selectedUserIds: new Set<number>() };
    });
  }

  private navigateWithFilter = (tab: string, filter?: string): void => {
    const issueFilters: IssueFilterType[] = filter
      ? [filter as IssueFilterType]
      : ['all'];
    this.setState({
      activeTab: tab as TabType,
      issueFilters,
      selectedUser: null
    });
    if (tab === 'usage') {
      void this.loadUsageData();
    }
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

  /**
   * Map DataTable column keys to ILicenceUser property names
   */
  private resolveSortField(columnKey: string): string {
    var map: Record<string, string> = {
      'user': 'Title',
      'lastSignIn': 'LastSignInDate',
      'department': 'Department',
      'jobTitle': 'JobTitle',
      'licences': 'Licences',
      'issueType': 'IssueType'
    };
    return map[columnKey] || columnKey;
  }

  private onUserClick = (user: ILicenceUser): void => {
    this.setState({ selectedUser: user });
  }

  private onBackFromUserDetail = (): void => {
    this.setState({ selectedUser: null });
  }

  private onDepartmentFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ departmentFilter: e.target.value });
  }

  private onUsersLicenceFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ usersLicenceFilter: e.target.value });
  }

  private toggleUsersIssueFilter = (filter: IssueFilterType): void => {
    this.setState(prev => {
      if (filter === 'all') {
        return { usersIssueFilters: ['all'] as IssueFilterType[] };
      }
      const withoutAll = prev.usersIssueFilters.filter(f => f !== 'all');
      const idx = withoutAll.indexOf(filter);
      let next: IssueFilterType[];
      if (idx >= 0) {
        next = withoutAll.filter(f => f !== filter);
        if (next.length === 0) next = ['all'];
      } else {
        next = [...withoutAll, filter];
      }
      return { usersIssueFilters: next };
    });
  }

  private getFilteredUsers(): ILicenceUser[] {
    const { data, issueFilters, searchText, sortField, sortDirection } = this.state;
    if (!data) return [];

    let filtered = this.dataService.filterUsers(
      data.users,
      searchText,
      undefined,
      undefined
    );

    // Apply multi-select issue filters
    if (issueFilters.indexOf('all') < 0 && issueFilters.length > 0) {
      filtered = filtered.filter(u => issueFilters.indexOf(u.IssueType as IssueFilterType) >= 0);
    }

    // Sort (only if a sort field is active)
    if (sortField) {
      var actualField = this.resolveSortField(sortField);
      filtered = [...filtered].sort((a, b) => {
        var aVal = (a as unknown as Record<string, unknown>)[actualField];
        var bVal = (b as unknown as Record<string, unknown>)[actualField];
        // Push nulls/undefined to end regardless of direction
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          var result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          return sortDirection === 'asc' ? result : -result;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

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

  private exportUsageToCSV = (): void => {
    const { usageProfiles } = this.state;
    if (!usageProfiles.length) return;

    const headers = ['Display Name', 'Email', 'Department', 'Has E5', 'E5 Utilisation %', 'Can Downgrade', 'Potential Annual Savings', 'E5 Features Used', 'Recommendation'];
    const rows = usageProfiles.map(p => [
      p.displayName,
      p.userPrincipalName,
      p.department || '',
      p.hasE5 ? 'Yes' : 'No',
      p.e5UtilisationPct.toString(),
      p.canDowngrade ? 'Yes' : 'No',
      p.potentialAnnualSavings.toString(),
      (p.e5FeaturesUsed || []).join('; '),
      p.recommendedLicence || p.downgradeReason || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `usage-analysis-${new Date().toISOString().split('T')[0]}.csv`;
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
        </div>
      </div>
    );
  }

  private renderNavTabs(): React.ReactElement {
    const { activeTab } = this.state;
    const tabs: { key: TabType; label: string }[] = [
      { key: 'summary', label: 'Summary' },
      { key: 'costs', label: 'Cost Analysis' },
      { key: 'utilisation', label: 'Utilisation & Adoption' },
      { key: 'usage', label: 'Usage Analysis' },
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
        onNavigate={(tab, filter) => this.navigateWithFilter(tab, filter)}
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
    const { data, kpi } = this.state;
    if (!data || !kpi) return <></>;

    const attentionSkus = this.dataService.getAttentionSkus(data.skus);
    const corePaidSkus = this.dataService.getCorePaidSkus(data.skus);
    const paidSkus = this.dataService.getPaidSkus(data.skus);

    return (
      <UtilisationPage
        kpi={kpi}
        attentionSkus={attentionSkus}
        corePaidSkus={corePaidSkus}
        paidSkus={paidSkus}
        allSkus={data.skus}
      />
    );
  }


  private renderIssuesTab(): React.ReactElement {
    const { issueCategories, issueFilters } = this.state;
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

    const filterLabel = issueFilters.indexOf('all') >= 0
      ? 'All Users'
      : issueFilters.join(', ');

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
            background: 'linear-gradient(135deg, rgba(0, 40, 158, 0.1), rgba(0, 40, 158, 0.1))',
            borderRadius: '12px',
            border: '1px solid rgba(0, 40, 158, 0.2)'
          }}>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#00289e' }}>
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
              Click categories below to filter. Multiple selections supported.
            </div>
          </div>
        )}

        {/* Issue Category Cards - Multi-select */}
        <div className={styles.issuesGrid} style={{ padding: '0 32px 24px' }}>
          {issueCategories.map(issue => (
            <IssueCard
              key={issue.type}
              issue={issue}
              isActive={issueFilters.indexOf(issue.type) >= 0}
              onClick={() => this.toggleIssueFilter(issue.type)}
            />
          ))}
        </div>

        {/* Users Table */}
        <div className={styles.tableSection}>
          <div className={styles.tableHeader}>
            <div className={styles.tableTitle}>
              {filterLabel} ({filteredUsers.length})
            </div>
            <div className={styles.tableActions}>
              <input
                type="text"
                className={styles.searchBox}
                placeholder="Search users..."
                value={this.state.searchText}
                onChange={this.onSearchChange}
              />
              {/* Multi-select filter chips */}
              <div className={styles.filterChipGroup}>
                {[
                  { key: 'all' as IssueFilterType, label: 'All' },
                  { key: 'Disabled' as IssueFilterType, label: 'Disabled' },
                  { key: 'Dual-Licensed' as IssueFilterType, label: 'Dual-Licensed' },
                  { key: 'Inactive 90+' as IssueFilterType, label: 'Inactive 90+' },
                  { key: 'Service Account' as IssueFilterType, label: 'Service Acct' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => this.toggleIssueFilter(opt.key)}
                    className={`${styles.filterChip}${issueFilters.indexOf(opt.key) >= 0 ? ` ${styles.filterChipActive}` : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Export button in table area */}
              <button className={styles.btn} onClick={this.exportToCSV} style={{ marginLeft: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
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
    const { data, departmentFilter, usersLicenceFilter, usersIssueFilters, searchText, sortField, sortDirection } = this.state;
    if (!data) return <></>;

    // Get unique departments for filter dropdown
    const departments = this.dataService.getDepartments(data.users);

    // Get all users with multi-filter support
    let allUsers = this.dataService.filterUsers(
      data.users,
      searchText,
      departmentFilter === 'all' ? undefined : departmentFilter,
      undefined
    );

    // Apply licence type filter
    if (usersLicenceFilter !== 'all') {
      switch (usersLicenceFilter) {
        case 'E5':
          allUsers = allUsers.filter(u => u.HasE5);
          break;
        case 'E3':
          allUsers = allUsers.filter(u => u.HasE3 && !u.HasE5);
          break;
        case 'other':
          allUsers = allUsers.filter(u => !u.HasE3 && !u.HasE5);
          break;
      }
    }

    // Apply issue type filter (multi-select)
    if (usersIssueFilters.indexOf('all') < 0 && usersIssueFilters.length > 0) {
      allUsers = allUsers.filter(u => usersIssueFilters.indexOf(u.IssueType as IssueFilterType) >= 0);
    }

    // Apply sorting (only if a sort field is active)
    if (sortField) {
      var actualField = this.resolveSortField(sortField);
      allUsers = [...allUsers].sort((a, b) => {
        var aVal = (a as unknown as Record<string, unknown>)[actualField];
        var bVal = (b as unknown as Record<string, unknown>)[actualField];
        // Push nulls/undefined to end regardless of direction
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          var result = aVal.toLowerCase().localeCompare(bVal.toLowerCase());
          return sortDirection === 'asc' ? result : -result;
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }

    const columns: IDataTableColumn[] = [
      { key: 'user', header: 'User', sortable: true },
      { key: 'department', header: 'Department', sortable: true },
      { key: 'jobTitle', header: 'Job Title' },
      { key: 'licences', header: 'Licences' },
      { key: 'status', header: 'Status' },
      { key: 'issueType', header: 'Issue Type' },
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
                value={searchText}
                onChange={this.onSearchChange}
              />
              {/* Department filter */}
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
              {/* Licence type filter */}
              <select
                className={styles.filterDropdown}
                value={usersLicenceFilter}
                onChange={this.onUsersLicenceFilterChange}
              >
                <option value="all">All Licences</option>
                <option value="E5">E5 Only</option>
                <option value="E3">E3 Only</option>
                <option value="other">Other</option>
              </select>
              {/* Issue type filter chips */}
              <div className={styles.filterChipGroup}>
                {[
                  { key: 'all' as IssueFilterType, label: 'All' },
                  { key: 'Disabled' as IssueFilterType, label: 'Disabled' },
                  { key: 'Dual-Licensed' as IssueFilterType, label: 'Dual' },
                  { key: 'Inactive 90+' as IssueFilterType, label: 'Inactive' },
                  { key: 'Service Account' as IssueFilterType, label: 'Svc Acct' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => this.toggleUsersIssueFilter(opt.key)}
                    className={`${styles.filterChip}${usersIssueFilters.indexOf(opt.key) >= 0 ? ` ${styles.filterChipActive}` : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Export button in table area */}
              <button className={styles.btn} onClick={this.exportToCSV} style={{ marginLeft: '8px' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export
              </button>
            </div>
          </div>
          <div className={styles.scrollableTable}>
            <DataTable
              users={allUsers}
              columns={columns}
              selectedIds={this.state.selectedUserIds}
              onSelectionChange={this.onSelectionChange}
              onSort={this.onSort}
              sortField={sortField}
              sortDirection={sortDirection}
              onRowClick={this.onUserClick}
            />
          </div>
        </div>
      </div>
    );
  }

  private renderUsageAnalysisTab(): React.ReactElement {
    const { usageProfiles, usageSummary, usageFeatureStats, usageLoading } = this.state;

    // Show empty state if no summary (loading or no data)
    if (!usageSummary) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <span>Loading usage analysis...</span>
        </div>
      );
    }

    return (
      <UsageAnalysisPage
        profiles={usageProfiles}
        summary={usageSummary}
        featureStats={usageFeatureStats}
        isLoading={usageLoading}
        onRefresh={() => {
          this.setState({ usageProfiles: [], usageSummary: null, usageFeatureStats: [] });
          void this.loadUsageData();
        }}
        onExport={() => this.exportUsageToCSV()}
      />
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
      case 'usage':
        return this.renderUsageAnalysisTab();
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

        {this.props.graphClient && (
          <FeedbackButton
            spHttpClient={this.props.context.spHttpClient}
            graphClient={this.props.graphClient}
            siteUrl={this.props.context.pageContext.web.absoluteUrl}
            currentPage="LicenceIntelligence"
          />
        )}
      </div>
    );
  }
}
