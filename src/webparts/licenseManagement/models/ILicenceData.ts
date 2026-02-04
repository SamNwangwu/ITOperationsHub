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

// ===========================================
// V3: Usage Analysis Types (Graph API Reports)
// ===========================================

/**
 * M365 App usage per user from Graph API
 * Source: reports/getM365AppUserDetail
 */
export interface IM365AppUsage {
  userPrincipalName: string;
  displayName: string;
  reportRefreshDate: string;
  // Desktop apps
  hasOutlookWindows: boolean;
  hasWordWindows: boolean;
  hasExcelWindows: boolean;
  hasPowerPointWindows: boolean;
  hasOneNoteWindows: boolean;
  hasTeamsWindows: boolean;
  // Web apps
  hasOutlookWeb: boolean;
  hasWordWeb: boolean;
  hasExcelWeb: boolean;
  hasPowerPointWeb: boolean;
  hasOneNoteWeb: boolean;
  hasTeamsWeb: boolean;
  // Mobile apps
  hasOutlookMobile: boolean;
  hasWordMobile: boolean;
  hasExcelMobile: boolean;
  hasPowerPointMobile: boolean;
  hasOneNoteMobile: boolean;
  hasTeamsMobile: boolean;
  // Last activity dates
  outlookLastActivityDate: string | null;
  wordLastActivityDate: string | null;
  excelLastActivityDate: string | null;
  powerPointLastActivityDate: string | null;
  oneNoteLastActivityDate: string | null;
  teamsLastActivityDate: string | null;
}

/**
 * E5-exclusive feature usage tracking
 */
export interface IE5FeatureUsage {
  userPrincipalName: string;
  displayName: string;
  // Security & Compliance (E5 exclusive)
  usesDefenderForEndpoint: boolean;
  defenderLastActivity: string | null;
  usesDefenderForOffice365: boolean;
  defenderO365LastActivity: string | null;
  usesEDiscoveryPremium: boolean;
  eDiscoveryLastActivity: string | null;
  usesAdvancedCompliance: boolean;
  complianceLastActivity: string | null;
  // Analytics & BI (E5 exclusive)
  usesPowerBIPro: boolean;
  powerBILastActivity: string | null;
  usesMyAnalytics: boolean;
  myAnalyticsLastActivity: string | null;
  // Audio Conferencing (E5 exclusive)
  usesAudioConferencing: boolean;
  audioConfLastActivity: string | null;
  // Phone System (E5 exclusive)
  usesPhoneSystem: boolean;
  phoneSystemLastActivity: string | null;
}

/**
 * Combined user usage profile for downgrade analysis
 */
export interface IUserUsageProfile {
  userId: number;
  userPrincipalName: string;
  displayName: string;
  department: string;
  currentLicences: string[];
  hasE5: boolean;
  hasE3: boolean;
  // Overall activity
  lastSignIn: string | null;
  daysSinceSignIn: number;
  isActive: boolean; // Signed in within 30 days
  // App usage summary
  appsUsed: string[];
  appsNotUsed: string[];
  primaryApps: string[]; // Most frequently used
  // E5 feature utilisation (only relevant if hasE5)
  e5FeaturesUsed: string[];
  e5FeaturesNotUsed: string[];
  e5UtilisationPct: number; // % of E5 features actually used
  // Recommendation
  canDowngrade: boolean;
  recommendedLicence: string | null;
  downgradeReason: string;
  confidenceScore: number; // 0-100
  potentialMonthlySavings: number;
  potentialAnnualSavings: number;
}

/**
 * E5-exclusive features definition
 */
export const E5_EXCLUSIVE_FEATURES = [
  { id: 'defender_endpoint', name: 'Microsoft Defender for Endpoint', category: 'Security' },
  { id: 'defender_o365', name: 'Microsoft Defender for Office 365 P2', category: 'Security' },
  { id: 'ediscovery_premium', name: 'eDiscovery Premium', category: 'Compliance' },
  { id: 'advanced_compliance', name: 'Advanced Compliance', category: 'Compliance' },
  { id: 'power_bi_pro', name: 'Power BI Pro', category: 'Analytics' },
  { id: 'my_analytics', name: 'Viva Insights (MyAnalytics)', category: 'Analytics' },
  { id: 'audio_conferencing', name: 'Audio Conferencing', category: 'Communication' },
  { id: 'phone_system', name: 'Phone System', category: 'Communication' },
  { id: 'information_protection', name: 'Azure Information Protection P2', category: 'Security' },
  { id: 'cloud_app_security', name: 'Microsoft Defender for Cloud Apps', category: 'Security' }
] as const;

/**
 * Usage analysis summary for dashboard
 */
export interface IUsageAnalysisSummary {
  totalUsersAnalysed: number;
  e5UsersCount: number;
  e5UnderutilisedCount: number;
  e5UnderutilisedPct: number;
  averageE5UtilisationPct: number;
  downgradeRecommendations: number;
  potentialAnnualSavings: number;
  topUnusedFeatures: { feature: string; unusedCount: number; pct: number }[];
  departmentBreakdown: { department: string; e5Users: number; canDowngrade: number; savings: number }[];
}

/**
 * Feature usage stats for charts
 */
export interface IFeatureUsageStats {
  featureId: string;
  featureName: string;
  category: string;
  usersWithAccess: number;
  usersActuallyUsing: number;
  utilisationPct: number;
  lastUsedByAnyone: string | null;
}
