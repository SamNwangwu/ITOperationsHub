import * as React from 'react';
import styles from './LicenseManagement.module.scss';
import { ILicenseManagementProps } from './ILicenseManagementProps';
import { SharePointDataService } from '../services/SharePointDataService';
import { InsightEngine, IInsight } from '../services/InsightEngine';
import {
  ILicenceDashboardData,
  IKpiSummary,
  ILicenceUser,
  IIssueCategory,
  IPowerBiConfig
} from '../models/ILicenceData';
import { KpiCard, IssueCard, SkuCard, DataTable, IDataTableColumn } from './ui';
import { ExecutiveSummaryPage, CostAnalysisPage, UserDetailPage } from './pages';
import { UtilisationGauge } from './charts';

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
  powerBiConfig: IPowerBiConfig | null;
  selectedUser: ILicenceUser | null;
}

/**
 * Lebara M365 Licence Intelligence V2
 * Hybrid React SPFx + Power BI Dashboard
 *
 * Data flows from SharePoint lists populated by Get-LicenseIntelligence.ps1
 * Power BI visuals can be embedded for complex charts (when configured)
 */
export default class LicenseManagement extends React.Component<ILicenseManagementProps, ILicenseManagementState> {
  private dataService: SharePointDataService;
  private insightEngine: InsightEngine;

  constructor(props: ILicenseManagementProps) {
    super(props);

    this.dataService = new SharePointDataService(props.context);
    this.insightEngine = new InsightEngine();

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
      powerBiConfig: null,
      selectedUser: null
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
        isDataStale
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
    const { data, kpi, insights, issueCategories } = this.state;
    if (!data || !kpi) return <></>;

    const executiveSummary = this.insightEngine.generateExecutiveSummary(data, kpi);

    return (
      <ExecutiveSummaryPage
        data={data}
        kpi={kpi}
        insights={insights}
        issueCategories={issueCategories}
        executiveSummary={executiveSummary}
        onIssueClick={(issueType) => {
          this.setState({
            activeTab: 'issues',
            issueFilter: issueType as IssueFilterType
          });
        }}
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
            subtitle="Across all SKUs"
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
              subtitle={`${sku.Assigned} of ${sku.Purchased}`}
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
  }

  private renderIssuesTab(): React.ReactElement {
    const { issueCategories, issueFilter } = this.state;
    const filteredUsers = this.getFilteredUsers();

    const columns: IDataTableColumn[] = [
      { key: 'user', header: 'User', sortable: true },
      { key: 'licences', header: 'Licences' },
      { key: 'status', header: 'Status' },
      { key: 'issueType', header: 'Issue Type' },
      { key: 'lastSignIn', header: 'Last Sign-In', sortable: true },
      { key: 'department', header: 'Department', sortable: true }
    ];

    return (
      <>
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
      </>
    );
  }

  private renderUsersTab(): React.ReactElement {
    const { data } = this.state;
    if (!data) return <></>;

    // Get all users (not filtered by issues)
    const allUsers = this.dataService.filterUsers(
      data.users,
      this.state.searchText,
      undefined,
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
      <div className={styles.tableSection}>
        <div className={styles.tableHeader}>
          <div className={styles.tableTitle}>All Licensed Users ({allUsers.length})</div>
          <div className={styles.tableActions}>
            <input
              type="text"
              className={styles.searchBox}
              placeholder="Search users..."
              value={this.state.searchText}
              onChange={this.onSearchChange}
            />
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
