import * as React from 'react';
import styles from './LicenseManagement.module.scss';
import { ILicenseManagementProps } from './ILicenseManagementProps';

// License SKU IDs
const SKU_IDS: Record<string, string> = {
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'E5',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'E3',
  'f30db892-07e9-47e9-837c-80727f46fd3d': 'Power BI Pro',
  '1f2f344a-700d-42c9-9427-5cea1d5d7ba6': 'Visio Plan 2',
  '53818b1b-4a27-454b-8896-0dba576410e6': 'Project Plan 3'
};

// Interfaces
interface IUser {
  id: string;
  displayName: string;
  userPrincipalName: string;
  accountEnabled: boolean;
  assignedLicenses: { skuId: string }[];
  signInActivity?: {
    lastSignInDateTime?: string;
  };
  department?: string;
}

interface ISubscribedSku {
  skuId: string;
  skuPartNumber: string;
  prepaidUnits: { enabled: number };
  consumedUnits: number;
}

interface ILicenseSummary {
  skuId: string;
  name: string;
  purchased: number;
  assigned: number;
  available: number;
}

type IssueType = 'disabled' | 'dual' | 'inactive' | 'service' | 'all';
type ThemeMode = 'dark' | 'light';

interface ILicenseManagementState {
  users: IUser[];
  skus: ILicenseSummary[];
  loading: boolean;
  error: string;
  lastSync: string;
  activeTab: IssueType;
  searchText: string;
  licenseFilter: string;
  selectedUsers: Set<string>;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  theme: ThemeMode;
  counts: {
    disabled: number;
    dual: number;
    inactive: number;
    service: number;
    total: number;
  };
}

export default class LicenseManagement extends React.Component<ILicenseManagementProps, ILicenseManagementState> {

  private readonly E3_SKU = '6fd2c87f-b296-42f0-b197-1e91e994b900';
  private readonly E5_SKU = 'c7df2760-2c81-4ef7-b578-5b5392b571df';

  constructor(props: ILicenseManagementProps) {
    super(props);
    
    // Load saved theme preference
    const savedTheme = localStorage.getItem('licenseManagement_theme') as ThemeMode || 'dark';
    
    this.state = {
      users: [],
      skus: [],
      loading: true,
      error: '',
      lastSync: '-',
      activeTab: 'disabled',
      searchText: '',
      licenseFilter: 'all',
      selectedUsers: new Set(),
      sortField: 'displayName',
      sortDirection: 'asc',
      theme: savedTheme,
      counts: { disabled: 0, dual: 0, inactive: 0, service: 0, total: 0 }
    };
  }

  public componentDidMount(): void {
    void this.loadData();
  }

  private async loadData(): Promise<void> {
    this.setState({ loading: true, error: '' });

    try {
      // Fetch users with licenses
      const usersResponse = await this.props.graphClient
        .api('/users')
        .select('id,displayName,userPrincipalName,accountEnabled,assignedLicenses,signInActivity,department')
        .filter('assignedLicenses/$count ne 0')
        .top(999)
        .get();

      // Fetch subscribed SKUs
      const skusResponse = await this.props.graphClient
        .api('/subscribedSkus')
        .get();

      const users: IUser[] = usersResponse.value || [];
      const skusData: ISubscribedSku[] = skusResponse.value || [];

      // Filter to only E3/E5 users
      const licensedUsers = users.filter(u => 
        u.assignedLicenses.some(l => l.skuId === this.E3_SKU || l.skuId === this.E5_SKU)
      );

      // Process SKUs
      const skus: ILicenseSummary[] = skusData
        .filter(s => SKU_IDS[s.skuId])
        .map(s => ({
          skuId: s.skuId,
          name: SKU_IDS[s.skuId] || s.skuPartNumber,
          purchased: s.prepaidUnits.enabled,
          assigned: s.consumedUnits,
          available: s.prepaidUnits.enabled - s.consumedUnits
        }));

      // Calculate counts
      const counts = this.calculateCounts(licensedUsers);

      this.setState({
        users: licensedUsers,
        skus,
        counts,
        loading: false,
        lastSync: new Date().toLocaleString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      });

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.setState({
        loading: false,
        error: `Failed to load data: ${errorMessage}`
      });
    }
  }

  private calculateCounts(users: IUser[]): { disabled: number; dual: number; inactive: number; service: number; total: number } {
    let disabled = 0;
    let dual = 0;
    let inactive = 0;
    let service = 0;

    users.forEach(user => {
      const hasE3 = user.assignedLicenses.some(l => l.skuId === this.E3_SKU);
      const hasE5 = user.assignedLicenses.some(l => l.skuId === this.E5_SKU);

      if (!user.accountEnabled) {
        disabled++;
      } else if (hasE3 && hasE5) {
        dual++;
      } else if (this.isServiceAccount(user)) {
        service++;
      } else if (this.isInactive(user)) {
        inactive++;
      }
    });

    return { disabled, dual, inactive, service, total: users.length };
  }

  private isServiceAccount(user: IUser): boolean {
    const email = user.userPrincipalName.toLowerCase();
    const servicePatterns = ['svc-', 'service', 'noreply', 'admin@', 'system', 'shared', 'room', 'conference'];
    return servicePatterns.some(p => email.includes(p));
  }

  private isInactive(user: IUser): boolean {
    if (!user.signInActivity?.lastSignInDateTime) return true;
    const lastSignIn = new Date(user.signInActivity.lastSignInDateTime);
    const daysSince = Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));
    return daysSince > 90;
  }

  private getDaysSinceSignIn(user: IUser): number | null {
    if (!user.signInActivity?.lastSignInDateTime) return null;
    const lastSignIn = new Date(user.signInActivity.lastSignInDateTime);
    return Math.floor((Date.now() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getFilteredUsers(): IUser[] {
    const { users, activeTab, searchText, licenseFilter, sortField, sortDirection } = this.state;
    
    let filtered = users;

    // Filter by tab/issue type
    switch (activeTab) {
      case 'disabled':
        filtered = filtered.filter(u => !u.accountEnabled);
        break;
      case 'dual':
        filtered = filtered.filter(u => 
          u.accountEnabled &&
          u.assignedLicenses.some(l => l.skuId === this.E3_SKU) &&
          u.assignedLicenses.some(l => l.skuId === this.E5_SKU)
        );
        break;
      case 'inactive':
        filtered = filtered.filter(u => 
          u.accountEnabled && 
          !this.isServiceAccount(u) && 
          this.isInactive(u)
        );
        break;
      case 'service':
        filtered = filtered.filter(u => u.accountEnabled && this.isServiceAccount(u));
        break;
    }

    // Filter by search
    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(u =>
        u.displayName.toLowerCase().includes(search) ||
        u.userPrincipalName.toLowerCase().includes(search) ||
        (u.department || '').toLowerCase().includes(search)
      );
    }

    // Filter by license type
    if (licenseFilter !== 'all') {
      filtered = filtered.filter(u => {
        const hasE3 = u.assignedLicenses.some(l => l.skuId === this.E3_SKU);
        const hasE5 = u.assignedLicenses.some(l => l.skuId === this.E5_SKU);
        if (licenseFilter === 'e3only') return hasE3 && !hasE5;
        if (licenseFilter === 'e5only') return hasE5 && !hasE3;
        if (licenseFilter === 'both') return hasE3 && hasE5;
        return true;
      });
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'displayName':
          aVal = a.displayName.toLowerCase();
          bVal = b.displayName.toLowerCase();
          break;
        case 'lastSignIn':
          aVal = this.getDaysSinceSignIn(a) ?? 9999;
          bVal = this.getDaysSinceSignIn(b) ?? 9999;
          break;
        case 'department':
          aVal = (a.department || '').toLowerCase();
          bVal = (b.department || '').toLowerCase();
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }

  private toggleTheme = (): void => {
    const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('licenseManagement_theme', newTheme);
    this.setState({ theme: newTheme });
  }

  private onTabClick = (tab: IssueType): void => {
    this.setState({ activeTab: tab, selectedUsers: new Set() });
  }

  private onSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ searchText: e.target.value });
  }

  private onLicenseFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    this.setState({ licenseFilter: e.target.value });
  }

  private onSort = (field: string): void => {
    const { sortField, sortDirection } = this.state;
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    this.setState({ sortField: field, sortDirection: newDirection });
  }

  private toggleUserSelection = (userId: string): void => {
    const { selectedUsers } = this.state;
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    this.setState({ selectedUsers: newSelected });
  }

  private toggleSelectAll = (): void => {
    const filtered = this.getFilteredUsers();
    const { selectedUsers } = this.state;
    
    if (selectedUsers.size === filtered.length) {
      this.setState({ selectedUsers: new Set() });
    } else {
      this.setState({ selectedUsers: new Set(filtered.map(u => u.id)) });
    }
  }

  private exportToCSV = (): void => {
    const filtered = this.getFilteredUsers();
    const { selectedUsers } = this.state;
    
    const toExport = selectedUsers.size > 0 
      ? filtered.filter(u => selectedUsers.has(u.id))
      : filtered;

    const headers = ['Display Name', 'Email', 'Licenses', 'Account Enabled', 'Last Sign-In', 'Department'];
    const rows = toExport.map(u => [
      u.displayName,
      u.userPrincipalName,
      u.assignedLicenses.map(l => SKU_IDS[l.skuId] || l.skuId).join('+'),
      u.accountEnabled ? 'Yes' : 'No',
      u.signInActivity?.lastSignInDateTime || 'Never',
      u.department || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `license-audit-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  private getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  private formatLastSignIn(user: IUser): string {
    if (!user.signInActivity?.lastSignInDateTime) return 'Never';
    return new Date(user.signInActivity.lastSignInDateTime).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  private getSortIcon(field: string): string {
    const { sortField, sortDirection } = this.state;
    if (sortField !== field) return '↕';
    return sortDirection === 'asc' ? '↑' : '↓';
  }

  private calculateSavings(): number {
    const { counts } = this.state;
    const E3_ANNUAL_COST = 285; // GBP
    return (counts.dual + counts.disabled) * E3_ANNUAL_COST;
  }

  private getSkuStatus(sku: ILicenseSummary): 'healthy' | 'warning' | 'critical' {
    const utilization = sku.assigned / sku.purchased;
    if (utilization > 1) return 'critical';
    if (utilization > 0.9) return 'warning';
    return 'healthy';
  }

  public render(): React.ReactElement<ILicenseManagementProps> {
    const { loading, error, lastSync, activeTab, skus, counts, selectedUsers, theme } = this.state;
    const filteredUsers = this.getFilteredUsers();
    const themeClass = theme === 'light' ? styles.lightMode : '';

    return (
      <div className={`${styles.licenseManagement} ${themeClass}`}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div>
              <div className={styles.logoText}>License Management</div>
              <div className={styles.logoSubtitle}>Microsoft 365 Optimization</div>
            </div>
          </div>
          <div className={styles.headerRight}>
            <span className={styles.lastSync}>
              <span className={styles.syncDot}></span>
              Last sync: {lastSync}
            </span>
            <button className={styles.btnTheme} onClick={this.toggleTheme} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
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
              Sync Now
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && <div className={styles.errorBanner}>{error}</div>}

        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <span>Loading license data from Microsoft Graph...</span>
          </div>
        ) : (
          <>
            {/* License Overview Cards */}
            <div className={styles.licenseOverview}>
              {skus.filter(s => s.name === 'E5' || s.name === 'E3').map(sku => {
                const status = this.getSkuStatus(sku);
                const utilization = Math.round((sku.assigned / sku.purchased) * 100);
                return (
                  <div key={sku.skuId} className={`${styles.licenseCard} ${styles[sku.name.toLowerCase()]}`}>
                    <div className={styles.licenseHeader}>
                      <div>
                        <div className={styles.licenseName}>Microsoft 365 {sku.name}</div>
                        <div className={styles.licenseSku}>SPE_{sku.name}</div>
                      </div>
                      <span className={`${styles.licenseBadge} ${styles[status]}`}>
                        {status === 'critical' ? 'Over-allocated' : status === 'warning' ? 'Review' : 'Healthy'}
                      </span>
                    </div>
                    <div className={styles.licenseStats}>
                      <div className={styles.stat}>
                        <div className={`${styles.statValue} ${styles.purchased}`}>{sku.purchased}</div>
                        <div className={styles.statLabel}>Purchased</div>
                      </div>
                      <div className={styles.stat}>
                        <div className={`${styles.statValue} ${styles.assigned}`} style={status === 'critical' ? {color: '#ef4444'} : {}}>{sku.assigned}</div>
                        <div className={styles.statLabel}>Assigned</div>
                      </div>
                      <div className={styles.stat}>
                        <div className={`${styles.statValue} ${styles.available}`} style={sku.available < 0 ? {color: '#ef4444'} : {}}>{sku.available}</div>
                        <div className={styles.statLabel}>{sku.available < 0 ? 'Deficit' : 'Available'}</div>
                      </div>
                    </div>
                    <div className={styles.usageBar}>
                      <div className={`${styles.usageFill} ${styles[status]}`} style={{width: `${Math.min(utilization, 100)}%`}}></div>
                    </div>
                    <div className={styles.usageText} style={status === 'critical' ? {color: '#ef4444'} : {}}>
                      {utilization}% {status === 'critical' ? 'over-allocated!' : 'utilization'}
                    </div>
                  </div>
                );
              })}
              
              {/* Savings Card */}
              <div className={`${styles.licenseCard} ${styles.savings}`}>
                <div className={styles.savingsIcon}>💰</div>
                <div className={styles.savingsAmount}>£{this.calculateSavings().toLocaleString()}</div>
                <div className={styles.savingsLabel}>Potential Annual Savings</div>
                <div className={styles.savingsDetail}>
                  {counts.dual + counts.disabled} unnecessary E3 licenses
                </div>
              </div>
            </div>

            {/* Issues Section */}
            <div className={styles.issuesSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitle}>
                  ⚠️ License Issues
                  <span className={styles.issueCount}>{counts.disabled + counts.dual + counts.inactive + counts.service}</span>
                </div>
              </div>
              <div className={styles.issuesGrid}>
                <div 
                  className={`${styles.issueCard} ${activeTab === 'disabled' ? styles.active : ''}`}
                  onClick={() => this.onTabClick('disabled')}
                >
                  <div className={`${styles.issueIcon} ${styles.disabled}`}>🚫</div>
                  <div className={`${styles.issueNumber} ${styles.disabled}`}>{counts.disabled}</div>
                  <div className={styles.issueLabel}>Disabled Accounts</div>
                  <div className={styles.issueDesc}>Still holding licenses</div>
                </div>
                <div 
                  className={`${styles.issueCard} ${activeTab === 'dual' ? styles.active : ''}`}
                  onClick={() => this.onTabClick('dual')}
                >
                  <div className={`${styles.issueIcon} ${styles.dual}`}>⚡</div>
                  <div className={`${styles.issueNumber} ${styles.dual}`}>{counts.dual}</div>
                  <div className={styles.issueLabel}>Dual-Licensed</div>
                  <div className={styles.issueDesc}>E3 + E5 (only need E5)</div>
                </div>
                <div 
                  className={`${styles.issueCard} ${activeTab === 'inactive' ? styles.active : ''}`}
                  onClick={() => this.onTabClick('inactive')}
                >
                  <div className={`${styles.issueIcon} ${styles.inactive}`}>💤</div>
                  <div className={`${styles.issueNumber} ${styles.inactive}`}>{counts.inactive}</div>
                  <div className={styles.issueLabel}>Inactive Users</div>
                  <div className={styles.issueDesc}>No sign-in 90+ days</div>
                </div>
                <div 
                  className={`${styles.issueCard} ${activeTab === 'service' ? styles.active : ''}`}
                  onClick={() => this.onTabClick('service')}
                >
                  <div className={`${styles.issueIcon} ${styles.service}`}>🤖</div>
                  <div className={`${styles.issueNumber} ${styles.service}`}>{counts.service}</div>
                  <div className={styles.issueLabel}>Service Accounts</div>
                  <div className={styles.issueDesc}>Review license need</div>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className={styles.tableSection}>
              {selectedUsers.size > 0 && (
                <div className={styles.bulkActions}>
                  <div className={styles.bulkInfo}>
                    <input type="checkbox" checked={selectedUsers.size === filteredUsers.length} onChange={this.toggleSelectAll} />
                    <span>{selectedUsers.size} users selected</span>
                  </div>
                  <div className={styles.bulkButtons}>
                    <button className={styles.bulkBtn} onClick={this.exportToCSV}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Export Selected
                    </button>
                  </div>
                </div>
              )}

              <div className={styles.tableHeader}>
                <div className={styles.tableTitle}>
                  {activeTab === 'disabled' && 'Disabled Accounts'}
                  {activeTab === 'dual' && 'Dual-Licensed Users'}
                  {activeTab === 'inactive' && 'Inactive Users'}
                  {activeTab === 'service' && 'Service Accounts'}
                  {activeTab === 'all' && 'All Licensed Users'}
                  {' '}({filteredUsers.length})
                </div>
                <div className={styles.tableActions}>
                  <input
                    type="text"
                    className={styles.searchBox}
                    placeholder="Search users..."
                    onChange={this.onSearchChange}
                    value={this.state.searchText}
                  />
                  <select className={styles.filterDropdown} onChange={this.onLicenseFilterChange} value={this.state.licenseFilter}>
                    <option value="all">All Licenses</option>
                    <option value="e3only">E3 Only</option>
                    <option value="e5only">E5 Only</option>
                    <option value="both">E3 + E5</option>
                  </select>
                </div>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.checkboxCol}>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                          onChange={this.toggleSelectAll}
                        />
                      </th>
                      <th className={styles.sortable} onClick={() => this.onSort('displayName')}>
                        User {this.getSortIcon('displayName')}
                      </th>
                      <th>Licenses</th>
                      <th>Status</th>
                      <th className={styles.sortable} onClick={() => this.onSort('lastSignIn')}>
                        Last Sign-in {this.getSortIcon('lastSignIn')}
                      </th>
                      <th className={styles.sortable} onClick={() => this.onSort('department')}>
                        Department {this.getSortIcon('department')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={styles.emptyState}>No users found</td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id} className={selectedUsers.has(user.id) ? styles.selected : ''}>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={selectedUsers.has(user.id)}
                              onChange={() => this.toggleUserSelection(user.id)}
                            />
                          </td>
                          <td>
                            <div className={styles.userInfo}>
                              <div className={styles.userAvatar}>{this.getInitials(user.displayName)}</div>
                              <div>
                                <div className={styles.userName}>{user.displayName}</div>
                                <div className={styles.userEmail}>{user.userPrincipalName}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className={styles.licensePills}>
                              {user.assignedLicenses.some(l => l.skuId === this.E3_SKU) && (
                                <span className={`${styles.licensePill} ${styles.pillE3}`}>E3</span>
                              )}
                              {user.assignedLicenses.some(l => l.skuId === this.E5_SKU) && (
                                <span className={`${styles.licensePill} ${styles.pillE5}`}>E5</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${user.accountEnabled ? styles.statusActive : styles.statusDisabled}`}>
                              {user.accountEnabled ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          <td className={styles.lastSignIn}>{this.formatLastSignIn(user)}</td>
                          <td className={styles.department}>{user.department || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Stats Footer */}
            <div className={styles.statsFooter}>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>👥</span>
                <span className={styles.statValue}>{counts.total}</span>
                <span className={styles.statLabel}>Total Licensed Users</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>📊</span>
                <span className={styles.statValue}>{skus.reduce((sum, s) => sum + s.purchased, 0)}</span>
                <span className={styles.statLabel}>Total Licenses Purchased</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statIcon}>⚠️</span>
                <span className={styles.statValue}>{counts.disabled + counts.dual + counts.inactive}</span>
                <span className={styles.statLabel}>Issues to Resolve</span>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }
}
