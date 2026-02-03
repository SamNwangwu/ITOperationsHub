/**
 * Type definitions for Licence Intelligence V2
 * Maps to SharePoint list schemas defined in SharePointLists.json
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

// Power BI embed configuration
export interface IPowerBiConfig {
  workspaceId: string;
  reportId: string;
  embedUrl?: string;
  accessToken?: string;
}
