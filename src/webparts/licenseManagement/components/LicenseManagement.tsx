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
import { KpiCard, IssueCard, InsightCard, SkuCard, SavingsHero, DataTable, IDataTableColumn } from './ui';

type TabType = 'summary' | 'issues' | 'skus' | 'users';
type ThemeMode = 'dark' | 'light';
type IssueFilterType = 'all' | 'Disabled' | 'Dual-Licensed' | 'Inactive 90+' | 'Service Account';

interface ILicenseManagementState {
  data: ILicenceDashboardData | null;
  kpi: IKpiSummary | null;
  insights: IInsight[];
  issueCategories: IIssueCategory[];
  loading: boolean;
  error: string;
  lastSync: string;
  activeTab: TabType;
  issueFilter: IssueFilterType;
  searchText: string;
  selectedUserIds: Set<number>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  theme: ThemeMode;
  powerBiConfig: IPowerBiConfig | null;
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

    const savedTheme = localStorage.getItem('licenseManagement_theme') as ThemeMode || 'dark';

    this.state = {
      data: null,
      kpi: null,
      insights: [],
      issueCategories: [],
      loading: true,
      error: '',
      lastSync: '-',
      activeTab: 'summary',
      issueFilter: 'all',
      searchText: '',
      selectedUserIds: new Set(),
      sortField: 'Title',
      sortDirection: 'asc',
      theme: savedTheme,
      powerBiConfig: null
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

      this.setState({
        data,
        kpi,
        insights,
        issueCategories,
        loading: false,
        lastSync: new Date().toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState({
        loading: false,
        error: `Failed to load data: ${errorMessage}. Make sure the SharePoint lists exist and have been populated by the PowerShell script.`
      });
    }
  }

  private toggleTheme = (): void => {
    const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('licenseManagement_theme', newTheme);
    this.setState({ theme: newTheme });
  }

  private onTabChange = (tab: TabType): void => {
    this.setState({ activeTab: tab, selectedUserIds: new Set() });
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
    const { lastSync, theme } = this.state;

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
            <span className={styles.syncDot}></span>
            Last sync: {lastSync}
          </span>
          <button className={styles.btnTheme} onClick={this.toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19'}
          </button>
          <button className={styles.btn} onClick={this.exportToCSV}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>
          <button className={styles.btnPrimary} onClick={() => void this.loadData()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>
    );
  }

  private renderNavTabs(): React.ReactElement {
    const { activeTab } = this.state;
    const tabs: { key: TabType; label: string }[] = [
      { key: 'summary', label: 'Executive Summary' },
      { key: 'issues', label: 'Issues & Optimisation' },
      { key: 'skus', label: 'Licence SKUs' },
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
    const { data, kpi, insights } = this.state;
    if (!data || !kpi) return <></>;

    const executiveSummary = this.insightEngine.generateExecutiveSummary(data, kpi);

    return (
      <>
        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <KpiCard
            title="Total Licensed Users"
            value={kpi.totalLicensedUsers.toLocaleString()}
            icon={'\uD83D\uDC65'}
            color="purple"
            subtitle={`${data.skus.length} licence types`}
          />
          <KpiCard
            title="Active Users"
            value={`${kpi.activeUsersPct}%`}
            icon={'\u2705'}
            color="green"
            subtitle={`${kpi.activeUsersCount.toLocaleString()} users`}
            trend={kpi.activeUsersPct >= 80 ? { direction: 'stable', value: 'Healthy' } : { direction: 'down', value: 'Below target', isPositive: false }}
          />
          <KpiCard
            title="Potential Savings"
            value={`\u00A3${kpi.potentialAnnualSavings.toLocaleString()}`}
            icon={'\uD83D\uDCB0'}
            color="green"
            subtitle="Annual opportunity"
          />
          <KpiCard
            title="Issues to Review"
            value={kpi.issuesCount.toString()}
            icon={'\u26A0\uFE0F'}
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

        {/* Insights Grid */}
        <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
          <div className={styles.sectionTitle}>{'\uD83D\uDCA1'} Key Insights</div>
        </div>
        <div className={styles.insightsGrid}>
          {insights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>

        {/* Quick Issue Summary */}
        <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
          <div className={styles.sectionTitle}>{'\u26A0\uFE0F'} Licence Issues</div>
        </div>
        <div className={styles.issuesGrid} style={{ padding: '0 32px 24px' }}>
          {this.state.issueCategories.map(issue => (
            <IssueCard
              key={issue.type}
              issue={issue}
              onClick={() => {
                this.setState({ activeTab: 'issues', issueFilter: issue.type });
              }}
            />
          ))}
        </div>
      </>
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
          />
        </div>
      </>
    );
  }

  private renderSkusTab(): React.ReactElement {
    const { data, kpi } = this.state;
    if (!data || !kpi) return <></>;

    return (
      <>
        {/* Overall stats */}
        <div className={styles.kpiGrid}>
          <KpiCard
            title="Total Purchased"
            value={kpi.totalPurchasedLicences.toLocaleString()}
            icon={'\uD83D\uDCCA'}
            color="blue"
          />
          <KpiCard
            title="Total Assigned"
            value={kpi.totalAssignedLicences.toLocaleString()}
            icon={'\u2705'}
            color="purple"
          />
          <KpiCard
            title="Overall Utilisation"
            value={`${kpi.overallUtilisationPct}%`}
            icon={'\uD83D\uDCC8'}
            color={kpi.overallUtilisationPct >= 80 ? 'green' : 'orange'}
          />
          <KpiCard
            title="Monthly Spend"
            value={kpi.monthlySpend > 0 ? `\u00A3${kpi.monthlySpend.toLocaleString()}` : 'Configure Pricing'}
            icon={'\uD83D\uDCB7'}
            color="green"
            subtitle={kpi.annualSpend > 0 ? `\u00A3${kpi.annualSpend.toLocaleString()}/year` : 'Add pricing data'}
          />
        </div>

        {/* SKU Cards Grid */}
        <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
          <div className={styles.sectionTitle}>{'\uD83D\uDCC4'} Licence SKUs ({data.skus.length})</div>
        </div>
        <div className={styles.skuGrid}>
          {data.skus.map(sku => {
            const pricing = data.pricing.find(p => p.Title === sku.Title);
            return (
              <SkuCard key={sku.Id} sku={sku} pricing={pricing} />
            );
          })}
        </div>
      </>
    );
  }

  private renderUsersTab(): React.ReactElement {
    const filteredUsers = this.getFilteredUsers();

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
          <div className={styles.tableTitle}>All Licensed Users ({filteredUsers.length})</div>
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
          users={filteredUsers}
          columns={columns}
          selectedIds={this.state.selectedUserIds}
          onSelectionChange={this.onSelectionChange}
          onSort={this.onSort}
          sortField={this.state.sortField}
          sortDirection={this.state.sortDirection}
        />
      </div>
    );
  }

  private renderContent(): React.ReactElement {
    const { activeTab } = this.state;

    switch (activeTab) {
      case 'summary':
        return this.renderSummaryTab();
      case 'issues':
        return this.renderIssuesTab();
      case 'skus':
        return this.renderSkusTab();
      case 'users':
        return this.renderUsersTab();
      default:
        return this.renderSummaryTab();
    }
  }

  public render(): React.ReactElement<ILicenseManagementProps> {
    const { loading, error, theme } = this.state;
    const themeClass = theme === 'light' ? styles.lightMode : '';

    return (
      <div className={`${styles.licenseManagement} ${themeClass}`}>
        {this.renderHeader()}

        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <span>Loading licence data from SharePoint...</span>
          </div>
        ) : (
          <>
            {this.renderNavTabs()}
            {this.renderContent()}
          </>
        )}
      </div>
    );
  }
}
