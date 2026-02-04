/**
 * Type definitions for Licence Intelligence V3
 * Maps to SharePoint list schemas defined in SharePointLists.json
 * V3: Added downgrade recommendations, alerts, savings tracking, and action center support
 */

// LicenceUsers list
export interface ILicenceUser {
  Id: number;
  Title: string; // Display Name
  UserPrincipalName: string;
  AccountEnabled: boolean;
  Department: string;
  JobTitle: string;
  City: string;
  Licences: string; // Comma-separated
  LicenceCount: number;
  HasE3: boolean;
  HasE5: boolean;
  LastSignInDate: string | null;
  DaysSinceSignIn: number;
  IssueType: 'None' | 'Disabled' | 'Dual-Licensed' | 'Inactive 90+' | 'Service Account';
  IsServiceAccount: boolean;
  ExtractDate: string;
}

// V3: Extended issue types for more granular detection
export type ExtendedIssueType =
  | 'None'
  | 'Disabled'
  | 'Dual-Licensed'
  | 'Inactive 90+'
  | 'Service Account'
  | 'Over-Licensed'      // E5 user only using E3 features
  | 'Under-Utilised';    // User barely using their licence

// LicenceSkus list
export interface ILicenceSku {
  Id: number;
  Title: string; // Friendly name
  SkuPartNumber: string;
  Purchased: number;
  Assigned: number;
  Available: number;
  UtilisationPct: number;
  ExtractDate: string;
}

// LicencePricing list
export interface ILicencePricing {
  Id: number;
  Title: string; // SKU friendly name (must match LicenceSkus.Title)
  MonthlyCostPerUser: number;
  AnnualCostPerUser: number;
  Vendor: string;
  RenewalDate: string | null;
  ContractTerm: string;
}

// LicenceSnapshots list
export interface ILicenceSnapshot {
  Id: number;
  Title: string; // "SKU Name - yyyy-MM-01"
  SnapshotDate: string;
  SkuName: string;
  Purchased: number;
  Assigned: number;
  Available: number;
  UtilisationPct: number;
  TotalUsers: number;
  DisabledCount: number;
  InactiveCount: number;
  DualCount: number;
  ServiceCount: number;
}

// UsageReports list
export interface IUsageReport {
  Id: number;
  Title: string; // UserPrincipalName
  OneDriveUsedGB: number;
  OneDriveAllocatedGB: number;
  MailboxUsedGB: number;
  MailboxAllocatedGB: number;
  ExtractDate: string;
}

// Aggregated data for dashboard
export interface ILicenceDashboardData {
  users: ILicenceUser[];
  skus: ILicenceSku[];
  pricing: ILicencePricing[];
  snapshots: ILicenceSnapshot[];
  usage: IUsageReport[];
  lastRefresh: Date;
}

// KPI summaries
export interface IKpiSummary {
  totalLicensedUsers: number;
  activeUsersCount: number;
  activeUsersPct: number;
  totalPurchasedLicences: number;
  totalAssignedLicences: number;
  overallUtilisationPct: number;
  monthlySpend: number;
  annualSpend: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  issuesCount: number;
  disabledCount: number;
  dualLicensedCount: number;
  inactiveCount: number;
  serviceAccountCount: number;
}

// Trend data point for charts
export interface ITrendDataPoint {
  date: string;
  skuName: string;
  purchased: number;
  assigned: number;
  utilisation: number;
}

// Issue category for IssueCard component
export interface IIssueCategory {
  type: 'Disabled' | 'Dual-Licensed' | 'Inactive 90+' | 'Service Account';
  count: number;
  potentialSavings: number;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  icon: string;
}

// ===========================================
// V3: Downgrade Recommendation Types
// ===========================================

export type DowngradeType = 'E5→E3' | 'E3→F3' | 'E3→Business Basic' | 'Remove Licence';

export interface IDowngradeRecommendation {
  userId: number;
  userName: string;
  userEmail: string;
  department: string;
  currentLicence: string;
  recommendedLicence: string | null; // null = remove
  downgradeType: DowngradeType;
  reason: string;
  monthlySavings: number;
  annualSavings: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface IDowngradeSummary {
  type: DowngradeType;
  count: number;
  users: IDowngradeRecommendation[];
  totalMonthlySavings: number;
  totalAnnualSavings: number;
  description: string;
}

// ===========================================
// V3: Alert System Types
// ===========================================

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'success';
export type AlertCategory = 'capacity' | 'cost' | 'compliance' | 'renewal' | 'action';

export interface IAlert {
  id: string;
  severity: AlertSeverity;
  category: AlertCategory;
  title: string;
  description: string;
  metric?: string;
  actionLabel?: string;
  actionType?: 'navigate' | 'dismiss' | 'external';
  actionTarget?: string;
  createdAt: Date;
  dismissedAt?: Date;
  dismissedBy?: string;
}

// ===========================================
// V3: Savings Tracker Types
// ===========================================

export type SavingsStatus = 'identified' | 'in_progress' | 'realised' | 'dismissed';

export interface ISavingsItem {
  id: string;
  type: string;
  description: string;
  userIds: number[];
  userCount: number;
  monthlySavings: number;
  annualSavings: number;
  status: SavingsStatus;
  createdAt: Date;
  actionedAt?: Date;
  actionedBy?: string;
  completedAt?: Date;
}

export interface ISavingsSummary {
  identified: number;
  inProgress: number;
  realised: number;
  dismissed: number;
  totalIdentified: number;
  totalRealised: number;
  realisationPct: number;
}

// ===========================================
// V3: Month-over-Month Comparison Types
// ===========================================

export interface IMonthComparison {
  metric: string;
  previousValue: number;
  currentValue: number;
  change: number;
  changePct: number;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Whether the trend direction is good
}

export interface IMonthComparisonData {
  currentMonth: string;
  previousMonth: string;
  comparisons: IMonthComparison[];
  summaryText: string;
}

// ===========================================
// V3: Action Center Types
// ===========================================

export type ActionType = 'remove_licence' | 'downgrade' | 'review' | 'send_reminder' | 'create_ticket';
export type ActionStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface IBulkAction {
  id: string;
  type: ActionType;
  title: string;
  description: string;
  userIds: number[];
  userCount: number;
  estimatedSavings: number;
  severity: AlertSeverity;
  status: ActionStatus;
  createdAt: Date;
}

// ===========================================
// V3: Extended KPI Summary
// ===========================================

export interface IKpiSummaryV3 extends IKpiSummary {
  // Downgrade opportunities
  downgradeOpportunities: number;
  downgradeAnnualSavings: number;

  // Savings tracking
  savingsIdentified: number;
  savingsRealised: number;
  savingsRealisationPct: number;

  // Alert counts
  criticalAlerts: number;
  warningAlerts: number;

  // Month comparison
  monthOverMonthChange: number;
  monthOverMonthChangePct: number;
}

// ===========================================
// V3: User Cost Breakdown (for accurate costing)
// ===========================================

export interface IUserCostBreakdown {
  userId: number;
  userName: string;
  licences: {
    name: string;
    skuPartNumber?: string;
    monthlyCost: number;
    annualCost: number;
    pricingSource: 'direct' | 'sku_lookup' | 'friendly_name' | 'not_found';
  }[];
  totalMonthlyCost: number;
  totalAnnualCost: number;
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
  issueType: string;
  savingsReason?: string;
}
