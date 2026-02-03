import { WebPartContext } from '@microsoft/sp-webpart-base';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import {
  ILicenceUser,
  ILicenceSku,
  ILicencePricing,
  ILicenceSnapshot,
  IUsageReport,
  ILicenceDashboardData,
  IKpiSummary,
  IIssueCategory,
  ITrendDataPoint
} from '../models/ILicenceData';

interface ISharePointListResponse<T> {
  value: T[];
}

/**
 * Service for reading licence data from SharePoint lists
 * Data is written by the PowerShell script Get-LicenseIntelligence.ps1
 */
export class SharePointDataService {
  private context: WebPartContext;
  private siteUrl: string;

  constructor(context: WebPartContext, siteUrl?: string) {
    this.context = context;
    this.siteUrl = siteUrl || context.pageContext.web.absoluteUrl;
  }

  /**
   * Fetch all items from a SharePoint list
   */
  private async getListItems<T>(listName: string, select?: string, top: number = 5000): Promise<T[]> {
    let url = `${this.siteUrl}/_api/web/lists/getbytitle('${listName}')/items?$top=${top}`;
    if (select) {
      url += `&$select=${select}`;
    }

    const response: SPHttpClientResponse = await this.context.spHttpClient.get(
      url,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch ${listName}: ${response.status} - ${errorText}`);
    }

    const data: ISharePointListResponse<T> = await response.json();
    return data.value;
  }

  /**
   * Load all licence data from SharePoint lists
   */
  public async loadDashboardData(): Promise<ILicenceDashboardData> {
    const [users, skus, pricing, snapshots, usage] = await Promise.all([
      this.getListItems<ILicenceUser>('LicenceUsers'),
      this.getListItems<ILicenceSku>('LicenceSkus'),
      this.getListItems<ILicencePricing>('LicencePricing'),
      this.getListItems<ILicenceSnapshot>('LicenceSnapshots'),
      this.getListItems<IUsageReport>('UsageReports')
    ]);

    return {
      users,
      skus,
      pricing,
      snapshots,
      usage,
      lastRefresh: new Date()
    };
  }

  /**
   * Load only users list (for user detail views)
   */
  public async loadUsers(): Promise<ILicenceUser[]> {
    return this.getListItems<ILicenceUser>('LicenceUsers');
  }

  /**
   * Load only SKUs list
   */
  public async loadSkus(): Promise<ILicenceSku[]> {
    return this.getListItems<ILicenceSku>('LicenceSkus');
  }

  /**
   * Load pricing data
   */
  public async loadPricing(): Promise<ILicencePricing[]> {
    return this.getListItems<ILicencePricing>('LicencePricing');
  }

  /**
   * Load snapshots for trend analysis
   */
  public async loadSnapshots(): Promise<ILicenceSnapshot[]> {
    return this.getListItems<ILicenceSnapshot>('LicenceSnapshots');
  }

  /**
   * Calculate KPI summary from dashboard data
   */
  public calculateKpiSummary(data: ILicenceDashboardData): IKpiSummary {
    const { users, skus, pricing } = data;

    // User counts
    const totalLicensedUsers = users.length;
    const activeUsersCount = users.filter(u => u.AccountEnabled && u.DaysSinceSignIn < 90).length;
    const activeUsersPct = totalLicensedUsers > 0 ? Math.round((activeUsersCount / totalLicensedUsers) * 100) : 0;

    // Issue counts
    const disabledCount = users.filter(u => u.IssueType === 'Disabled').length;
    const dualLicensedCount = users.filter(u => u.IssueType === 'Dual-Licensed').length;
    const inactiveCount = users.filter(u => u.IssueType === 'Inactive 90+').length;
    const serviceAccountCount = users.filter(u => u.IssueType === 'Service Account').length;
    const issuesCount = disabledCount + dualLicensedCount + inactiveCount + serviceAccountCount;

    // Licence counts
    const totalPurchasedLicences = skus.reduce((sum, s) => sum + s.Purchased, 0);
    const totalAssignedLicences = skus.reduce((sum, s) => sum + s.Assigned, 0);
    const overallUtilisationPct = totalPurchasedLicences > 0
      ? Math.round((totalAssignedLicences / totalPurchasedLicences) * 100)
      : 0;

    // Cost calculations (join SKUs with pricing)
    let monthlySpend = 0;
    let potentialMonthlySavings = 0;

    skus.forEach(sku => {
      const priceInfo = pricing.find(p => p.Title === sku.Title);
      if (priceInfo) {
        monthlySpend += sku.Assigned * priceInfo.MonthlyCostPerUser;
      }
    });

    // Calculate savings from issues
    users.forEach(user => {
      if (user.IssueType !== 'None') {
        // Get the user's licences and sum up their costs
        const licenceNames = user.Licences.split(',').map(l => l.trim());
        licenceNames.forEach(licName => {
          const priceInfo = pricing.find(p => p.Title === licName);
          if (priceInfo) {
            potentialMonthlySavings += priceInfo.MonthlyCostPerUser;
          }
        });
      }
    });

    return {
      totalLicensedUsers,
      activeUsersCount,
      activeUsersPct,
      totalPurchasedLicences,
      totalAssignedLicences,
      overallUtilisationPct,
      monthlySpend,
      annualSpend: monthlySpend * 12,
      potentialMonthlySavings,
      potentialAnnualSavings: potentialMonthlySavings * 12,
      issuesCount,
      disabledCount,
      dualLicensedCount,
      inactiveCount,
      serviceAccountCount
    };
  }

  /**
   * Get issue categories with counts and savings
   */
  public getIssueCategories(data: ILicenceDashboardData): IIssueCategory[] {
    const { users, pricing } = data;

    const calculateSavings = (issueUsers: ILicenceUser[]): number => {
      let savings = 0;
      issueUsers.forEach(user => {
        const licenceNames = user.Licences.split(',').map(l => l.trim());
        licenceNames.forEach(licName => {
          const priceInfo = pricing.find(p => p.Title === licName);
          if (priceInfo) {
            savings += priceInfo.MonthlyCostPerUser * 12; // Annual savings
          }
        });
      });
      return savings;
    };

    const disabledUsers = users.filter(u => u.IssueType === 'Disabled');
    const dualUsers = users.filter(u => u.IssueType === 'Dual-Licensed');
    const inactiveUsers = users.filter(u => u.IssueType === 'Inactive 90+');
    const serviceUsers = users.filter(u => u.IssueType === 'Service Account');

    return [
      {
        type: 'Disabled',
        count: disabledUsers.length,
        potentialSavings: calculateSavings(disabledUsers),
        description: 'Disabled accounts still holding licences',
        severity: 'critical',
        icon: '🚫'
      },
      {
        type: 'Dual-Licensed',
        count: dualUsers.length,
        potentialSavings: calculateSavings(dualUsers) / 2, // Assume removing E3 when dual
        description: 'Users with both E3 and E5 (only need E5)',
        severity: 'warning',
        icon: '⚡'
      },
      {
        type: 'Inactive 90+',
        count: inactiveUsers.length,
        potentialSavings: calculateSavings(inactiveUsers),
        description: 'No sign-in for 90+ days',
        severity: 'warning',
        icon: '💤'
      },
      {
        type: 'Service Account',
        count: serviceUsers.length,
        potentialSavings: 0, // Service accounts need review, not automatic savings
        description: 'Service accounts - review licence need',
        severity: 'info',
        icon: '🤖'
      }
    ];
  }

  /**
   * Get trend data for charts (last N months)
   */
  public getTrendData(snapshots: ILicenceSnapshot[], months: number = 6): ITrendDataPoint[] {
    // Get unique dates and sort descending
    const uniqueDates = [...new Set(snapshots.map(s => s.SnapshotDate))]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .slice(0, months);

    const trendData: ITrendDataPoint[] = [];

    uniqueDates.reverse().forEach(date => {
      const snapsForDate = snapshots.filter(s => s.SnapshotDate === date);
      snapsForDate.forEach(snap => {
        trendData.push({
          date: new Date(date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' }),
          skuName: snap.SkuName,
          purchased: snap.Purchased,
          assigned: snap.Assigned,
          utilisation: snap.UtilisationPct
        });
      });
    });

    return trendData;
  }

  /**
   * Get users by issue type
   */
  public getUsersByIssue(users: ILicenceUser[], issueType: string): ILicenceUser[] {
    if (issueType === 'all' || issueType === 'None') {
      return users;
    }
    return users.filter(u => u.IssueType === issueType);
  }

  /**
   * Search and filter users
   */
  public filterUsers(
    users: ILicenceUser[],
    searchText: string,
    department?: string,
    issueType?: string,
    hasSku?: string
  ): ILicenceUser[] {
    let filtered = [...users];

    if (searchText) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(u =>
        u.Title.toLowerCase().includes(search) ||
        u.UserPrincipalName.toLowerCase().includes(search) ||
        (u.Department || '').toLowerCase().includes(search)
      );
    }

    if (department && department !== 'all') {
      filtered = filtered.filter(u => u.Department === department);
    }

    if (issueType && issueType !== 'all') {
      filtered = filtered.filter(u => u.IssueType === issueType);
    }

    if (hasSku && hasSku !== 'all') {
      filtered = filtered.filter(u =>
        u.Licences.toLowerCase().includes(hasSku.toLowerCase())
      );
    }

    return filtered;
  }

  /**
   * Get unique departments from users
   */
  public getDepartments(users: ILicenceUser[]): string[] {
    return [...new Set(users.map(u => u.Department).filter(d => d))].sort();
  }

  /**
   * Get user with usage data joined
   */
  public getUserWithUsage(user: ILicenceUser, usageReports: IUsageReport[]): ILicenceUser & Partial<IUsageReport> {
    const usage = usageReports.find(u => u.Title === user.UserPrincipalName);
    return {
      ...user,
      OneDriveUsedGB: usage?.OneDriveUsedGB,
      OneDriveAllocatedGB: usage?.OneDriveAllocatedGB,
      MailboxUsedGB: usage?.MailboxUsedGB,
      MailboxAllocatedGB: usage?.MailboxAllocatedGB
    };
  }
}

export default SharePointDataService;
