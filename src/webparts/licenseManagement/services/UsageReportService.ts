/**
 * Usage Report Service - V3 Feature
 * Fetches M365 usage data from Microsoft Graph API
 * Requires: Reports.Read.All permission
 */

import { WebPartContext } from '@microsoft/sp-webpart-base';
import { AadHttpClient, HttpClientResponse } from '@microsoft/sp-http';
import {
  IM365AppUsage,
  IE5FeatureUsage,
  IUserUsageProfile,
  IUsageAnalysisSummary,
  IFeatureUsageStats,
  ILicenceUser,
  ILicencePricing,
  E5_EXCLUSIVE_FEATURES
} from '../models/ILicenceData';
import { getSkuFriendlyName } from '../utils/SkuClassifier';
import { STANDARD_PRICING } from '../constants/Pricing';

// Graph API base URL
const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const GRAPH_BETA_URL = 'https://graph.microsoft.com/beta';

export class UsageReportService {
  private context: WebPartContext;
  private graphClient: AadHttpClient | null = null;
  private pricing: Map<string, number> = new Map();

  constructor(context: WebPartContext) {
    this.context = context;
  }

  /**
   * Initialise the service with pricing data
   */
  public initialise(pricing: ILicencePricing[]): void {
    this.pricing.clear();
    pricing.forEach(p => {
      this.pricing.set(p.Title, p.MonthlyCostPerUser);
      this.pricing.set(p.Title.toLowerCase(), p.MonthlyCostPerUser);
    });
  }

  /**
   * Get AAD HTTP Client for Graph API calls
   */
  private async getGraphClient(): Promise<AadHttpClient> {
    if (!this.graphClient) {
      this.graphClient = await this.context.aadHttpClientFactory.getClient('https://graph.microsoft.com');
    }
    return this.graphClient;
  }

  /**
   * Fetch M365 App usage report from Graph API
   * Returns CSV data parsed into objects
   */
  public async getM365AppUsage(period: string = 'D30'): Promise<IM365AppUsage[]> {
    try {
      const client = await this.getGraphClient();
      const response: HttpClientResponse = await client.get(
        `${GRAPH_BASE_URL}/reports/getM365AppUserDetail(period='${period}')`,
        AadHttpClient.configurations.v1
      );

      if (!response.ok) {
        console.warn('M365 App Usage report not available:', response.status);
        return [];
      }

      const csvData = await response.text();
      return this.parseM365AppUsageCSV(csvData);
    } catch (error) {
      console.error('Error fetching M365 App Usage:', error);
      return [];
    }
  }

  /**
   * Fetch Office 365 Active Users report
   */
  public async getOffice365ActiveUsers(period: string = 'D30'): Promise<Map<string, { lastActivity: string; products: string[] }>> {
    try {
      const client = await this.getGraphClient();
      const response: HttpClientResponse = await client.get(
        `${GRAPH_BASE_URL}/reports/getOffice365ActiveUserDetail(period='${period}')`,
        AadHttpClient.configurations.v1
      );

      if (!response.ok) {
        console.warn('Office 365 Active Users report not available:', response.status);
        return new Map();
      }

      const csvData = await response.text();
      return this.parseActiveUsersCSV(csvData);
    } catch (error) {
      console.error('Error fetching Office 365 Active Users:', error);
      return new Map();
    }
  }

  /**
   * Fetch Teams activity for E5 feature analysis
   */
  public async getTeamsUserActivity(period: string = 'D30'): Promise<Map<string, { meetings: number; calls: number; messages: number }>> {
    try {
      const client = await this.getGraphClient();
      const response: HttpClientResponse = await client.get(
        `${GRAPH_BASE_URL}/reports/getTeamsUserActivityUserDetail(period='${period}')`,
        AadHttpClient.configurations.v1
      );

      if (!response.ok) {
        return new Map();
      }

      const csvData = await response.text();
      return this.parseTeamsActivityCSV(csvData);
    } catch (error) {
      console.error('Error fetching Teams activity:', error);
      return new Map();
    }
  }

  /**
   * Parse M365 App Usage CSV into typed objects
   */
  private parseM365AppUsageCSV(csvData: string): IM365AppUsage[] {
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const results: IM365AppUsage[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const getVal = (colName: string): string => {
        const idx = headers.findIndex(h => h.toLowerCase().indexOf(colName.toLowerCase()) >= 0);
        return idx >= 0 ? values[idx] || '' : '';
      };

      const getBool = (colName: string): boolean => {
        const val = getVal(colName).toLowerCase();
        return val === 'yes' || val === 'true' || val === '1';
      };

      results.push({
        userPrincipalName: getVal('User Principal Name') || getVal('UPN'),
        displayName: getVal('Display Name'),
        reportRefreshDate: getVal('Report Refresh Date'),
        // Desktop
        hasOutlookWindows: getBool('Outlook (Windows)') || getBool('Has Outlook Windows'),
        hasWordWindows: getBool('Word (Windows)') || getBool('Has Word Windows'),
        hasExcelWindows: getBool('Excel (Windows)') || getBool('Has Excel Windows'),
        hasPowerPointWindows: getBool('PowerPoint (Windows)') || getBool('Has PowerPoint Windows'),
        hasOneNoteWindows: getBool('OneNote (Windows)') || getBool('Has OneNote Windows'),
        hasTeamsWindows: getBool('Teams (Windows)') || getBool('Has Teams Windows'),
        // Web
        hasOutlookWeb: getBool('Outlook (Web)') || getBool('Has Outlook Web'),
        hasWordWeb: getBool('Word (Web)') || getBool('Has Word Web'),
        hasExcelWeb: getBool('Excel (Web)') || getBool('Has Excel Web'),
        hasPowerPointWeb: getBool('PowerPoint (Web)') || getBool('Has PowerPoint Web'),
        hasOneNoteWeb: getBool('OneNote (Web)') || getBool('Has OneNote Web'),
        hasTeamsWeb: getBool('Teams (Web)') || getBool('Has Teams Web'),
        // Mobile
        hasOutlookMobile: getBool('Outlook (Mobile)') || getBool('Has Outlook Mobile'),
        hasWordMobile: getBool('Word (Mobile)') || getBool('Has Word Mobile'),
        hasExcelMobile: getBool('Excel (Mobile)') || getBool('Has Excel Mobile'),
        hasPowerPointMobile: getBool('PowerPoint (Mobile)') || getBool('Has PowerPoint Mobile'),
        hasOneNoteMobile: getBool('OneNote (Mobile)') || getBool('Has OneNote Mobile'),
        hasTeamsMobile: getBool('Teams (Mobile)') || getBool('Has Teams Mobile'),
        // Last activity dates
        outlookLastActivityDate: getVal('Outlook Last Activity Date') || null,
        wordLastActivityDate: getVal('Word Last Activity Date') || null,
        excelLastActivityDate: getVal('Excel Last Activity Date') || null,
        powerPointLastActivityDate: getVal('PowerPoint Last Activity Date') || null,
        oneNoteLastActivityDate: getVal('OneNote Last Activity Date') || null,
        teamsLastActivityDate: getVal('Teams Last Activity Date') || null
      });
    }

    return results;
  }

  /**
   * Parse Active Users CSV
   */
  private parseActiveUsersCSV(csvData: string): Map<string, { lastActivity: string; products: string[] }> {
    const result = new Map<string, { lastActivity: string; products: string[] }>();
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return result;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const upnIdx = headers.findIndex(h => h.toLowerCase().indexOf('user principal name') >= 0);
      const lastActivityIdx = headers.findIndex(h => h.toLowerCase().indexOf('last activity date') >= 0);
      const productsIdx = headers.findIndex(h => h.toLowerCase().indexOf('assigned products') >= 0);

      if (upnIdx >= 0 && values[upnIdx]) {
        result.set(values[upnIdx].toLowerCase(), {
          lastActivity: lastActivityIdx >= 0 ? values[lastActivityIdx] : '',
          products: productsIdx >= 0 ? (values[productsIdx] || '').split('+').map(p => p.trim()) : []
        });
      }
    }

    return result;
  }

  /**
   * Parse Teams Activity CSV
   */
  private parseTeamsActivityCSV(csvData: string): Map<string, { meetings: number; calls: number; messages: number }> {
    const result = new Map<string, { meetings: number; calls: number; messages: number }>();
    const lines = csvData.split('\n').filter(line => line.trim());
    if (lines.length < 2) return result;

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const upnIdx = headers.findIndex(h => h.toLowerCase().indexOf('user principal name') >= 0);
      const meetingsIdx = headers.findIndex(h => h.toLowerCase().indexOf('meeting') >= 0);
      const callsIdx = headers.findIndex(h => h.toLowerCase().indexOf('call') >= 0);
      const messagesIdx = headers.findIndex(h => h.toLowerCase().indexOf('chat message') >= 0 || h.toLowerCase().indexOf('team chat') >= 0);

      if (upnIdx >= 0 && values[upnIdx]) {
        result.set(values[upnIdx].toLowerCase(), {
          meetings: meetingsIdx >= 0 ? parseInt(values[meetingsIdx], 10) || 0 : 0,
          calls: callsIdx >= 0 ? parseInt(values[callsIdx], 10) || 0 : 0,
          messages: messagesIdx >= 0 ? parseInt(values[messagesIdx], 10) || 0 : 0
        });
      }
    }

    return result;
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  /**
   * Generate user usage profiles by combining licence data with usage data
   */
  public async generateUserUsageProfiles(
    users: ILicenceUser[],
    appUsage: IM365AppUsage[]
  ): Promise<IUserUsageProfile[]> {
    // Create lookup map for app usage by UPN
    const appUsageMap = new Map<string, IM365AppUsage>();
    appUsage.forEach(u => {
      if (u.userPrincipalName) {
        appUsageMap.set(u.userPrincipalName.toLowerCase(), u);
      }
    });

    const profiles: IUserUsageProfile[] = [];

    for (const user of users) {
      const usageData = appUsageMap.get(user.UserPrincipalName.toLowerCase());
      const profile = this.buildUserProfile(user, usageData);
      profiles.push(profile);
    }

    return profiles;
  }

  /**
   * Build a single user's usage profile
   */
  private buildUserProfile(user: ILicenceUser, usageData?: IM365AppUsage): IUserUsageProfile {
    // Safe access to user properties - define all at the top
    const displayName = user.Title || user.UserPrincipalName || 'Unknown User';
    const userPrincipalName = user.UserPrincipalName || '';
    const daysSinceSignIn = user.DaysSinceSignIn || 0;
    const dept = (user.Department || '').toLowerCase();
    const title = (user.JobTitle || '').toLowerCase();

    const licenceString = user.Licences || '';
    const licences = licenceString.split(',').map(l => l.trim()).filter(l => l);
    const hasE5 = user.HasE5 || licences.some(l =>
      l.toLowerCase().indexOf('e5') >= 0 ||
      l.toLowerCase().indexOf('enterprisepremium') >= 0
    );
    const hasE3 = user.HasE3 || licences.some(l =>
      l.toLowerCase().indexOf('e3') >= 0 ||
      l.toLowerCase().indexOf('enterprisepack') >= 0
    );

    // Determine apps used based on usage data
    const appsUsed: string[] = [];
    const appsNotUsed: string[] = [];

    if (usageData) {
      // Check each app
      const appChecks = [
        { name: 'Outlook', used: usageData.hasOutlookWindows || usageData.hasOutlookWeb || usageData.hasOutlookMobile },
        { name: 'Word', used: usageData.hasWordWindows || usageData.hasWordWeb || usageData.hasWordMobile },
        { name: 'Excel', used: usageData.hasExcelWindows || usageData.hasExcelWeb || usageData.hasExcelMobile },
        { name: 'PowerPoint', used: usageData.hasPowerPointWindows || usageData.hasPowerPointWeb || usageData.hasPowerPointMobile },
        { name: 'OneNote', used: usageData.hasOneNoteWindows || usageData.hasOneNoteWeb || usageData.hasOneNoteMobile },
        { name: 'Teams', used: usageData.hasTeamsWindows || usageData.hasTeamsWeb || usageData.hasTeamsMobile }
      ];

      appChecks.forEach(check => {
        if (check.used) {
          appsUsed.push(check.name);
        } else {
          appsNotUsed.push(check.name);
        }
      });
    }

    // For E5 users, determine E5 feature usage
    // Uses department/title heuristics combined with actual app usage signals
    const e5FeaturesUsed: string[] = [];
    const e5FeaturesNotUsed: string[] = [];
    let e5UtilisationPct = 0;

    // Determine if user is active on Teams (used for Audio Conferencing / Phone System inference)
    const hasTeamsActive = appsUsed.indexOf('Teams') >= 0;

    if (hasE5) {
      E5_EXCLUSIVE_FEATURES.forEach(feature => {
        let likelyUsed = false;

        switch (feature.id) {
          case 'defender_endpoint':
          case 'defender_o365':
            // Defender runs silently for all active E5 users; attribute to IT/Security explicitly
            likelyUsed = daysSinceSignIn < 30 && (
              dept.indexOf('security') >= 0 || dept.indexOf('it') >= 0 ||
              dept.indexOf('infrastructure') >= 0 || dept.indexOf('engineering') >= 0 ||
              title.indexOf('security') >= 0 || title.indexOf('engineer') >= 0 ||
              title.indexOf('admin') >= 0
            );
            break;
          case 'information_protection':
          case 'cloud_app_security':
            // AIP and MCAS are tenant-wide; attribute to Security, IT, Compliance
            likelyUsed = dept.indexOf('security') >= 0 || dept.indexOf('it') >= 0 ||
              dept.indexOf('compliance') >= 0 || dept.indexOf('infrastructure') >= 0 ||
              title.indexOf('security') >= 0;
            break;
          case 'ediscovery_premium':
          case 'advanced_compliance':
            likelyUsed = dept.indexOf('legal') >= 0 || dept.indexOf('compliance') >= 0 ||
              dept.indexOf('hr') >= 0 || dept.indexOf('human') >= 0 ||
              title.indexOf('legal') >= 0 || title.indexOf('compliance') >= 0;
            break;
          case 'power_bi_pro':
            likelyUsed = dept.indexOf('finance') >= 0 || dept.indexOf('analytics') >= 0 ||
              dept.indexOf('data') >= 0 || dept.indexOf('business intelligence') >= 0 ||
              title.indexOf('analyst') >= 0 || title.indexOf('data') >= 0 ||
              title.indexOf('bi ') >= 0 || title.indexOf('reporting') >= 0;
            break;
          case 'audio_conferencing':
          case 'phone_system':
            // Any active Teams user likely uses calling/conferencing features
            likelyUsed = hasTeamsActive && daysSinceSignIn < 30;
            break;
          case 'my_analytics':
            likelyUsed = daysSinceSignIn < 30;
            break;
        }

        if (likelyUsed) {
          e5FeaturesUsed.push(feature.name);
        } else {
          e5FeaturesNotUsed.push(feature.name);
        }
      });

      e5UtilisationPct = E5_EXCLUSIVE_FEATURES.length > 0
        ? Math.round((e5FeaturesUsed.length / E5_EXCLUSIVE_FEATURES.length) * 100)
        : 0;
    }

    // Determine downgrade recommendation
    let canDowngrade = false;
    let recommendedLicence: string | null = null;
    let downgradeReason = '';
    let confidenceScore = 0;
    let potentialMonthlySavings = 0;
    let potentialAnnualSavings = 0;

    if (hasE5) {
      // E5 user - can they downgrade to E3?
      if (e5UtilisationPct < 30 && daysSinceSignIn < 90) {
        // Low E5 feature usage but still active
        canDowngrade = true;
        recommendedLicence = 'Microsoft 365 E3';
        downgradeReason = `Only using ${e5UtilisationPct}% of E5-exclusive features. Core apps (${appsUsed.join(', ') || 'standard'}) available in E3.`;
        confidenceScore = e5UtilisationPct < 10 ? 85 : 65;

        const e5Cost = this.getLicenceCost('Microsoft 365 E5');
        const e3Cost = this.getLicenceCost('Microsoft 365 E3');
        potentialMonthlySavings = e5Cost - e3Cost;
        potentialAnnualSavings = potentialMonthlySavings * 12;
      } else if (daysSinceSignIn >= 90) {
        // Inactive E5 user
        canDowngrade = true;
        recommendedLicence = null; // Remove licence
        downgradeReason = `Inactive for ${daysSinceSignIn} days. Consider removing E5 licence.`;
        confidenceScore = 90;
        potentialMonthlySavings = this.getLicenceCost('Microsoft 365 E5');
        potentialAnnualSavings = potentialMonthlySavings * 12;
      }
    } else if (hasE3) {
      // E3 user - could they use F3?
      const basicAppsOnly = appsUsed.length <= 3 &&
        appsUsed.every(a => ['Outlook', 'Teams'].indexOf(a) >= 0);

      if (basicAppsOnly && daysSinceSignIn < 90) {
        // Using only basic apps
        canDowngrade = true;
        recommendedLicence = 'Microsoft 365 F3';
        downgradeReason = `Only using ${appsUsed.join(', ') || 'basic apps'}. F3 licence may be sufficient.`;
        confidenceScore = 50; // Lower confidence - needs review

        const e3Cost = this.getLicenceCost('Microsoft 365 E3');
        const f3Cost = this.getLicenceCost('Microsoft 365 F3');
        potentialMonthlySavings = e3Cost - f3Cost;
        potentialAnnualSavings = potentialMonthlySavings * 12;
      }
    }

    return {
      userId: user.Id || 0,
      userPrincipalName: userPrincipalName,
      displayName: displayName,
      department: user.Department || 'Unknown',
      currentLicences: licences,
      hasE5,
      hasE3,
      lastSignIn: user.LastSignInDate || null,
      daysSinceSignIn: daysSinceSignIn,
      isActive: daysSinceSignIn < 30,
      appsUsed: appsUsed,
      appsNotUsed: appsNotUsed,
      primaryApps: appsUsed.slice(0, 3),
      e5FeaturesUsed: e5FeaturesUsed,
      e5FeaturesNotUsed: e5FeaturesNotUsed,
      e5UtilisationPct: e5UtilisationPct,
      canDowngrade: canDowngrade,
      recommendedLicence: recommendedLicence,
      downgradeReason: downgradeReason,
      confidenceScore: confidenceScore,
      potentialMonthlySavings: potentialMonthlySavings,
      potentialAnnualSavings: potentialAnnualSavings
    };
  }

  /**
   * Get licence cost from pricing map or standard pricing
   */
  private getLicenceCost(licenceName: string): number {
    if (this.pricing.has(licenceName)) {
      return this.pricing.get(licenceName)!;
    }
    if (this.pricing.has(licenceName.toLowerCase())) {
      return this.pricing.get(licenceName.toLowerCase())!;
    }
    return STANDARD_PRICING[licenceName] || 0;
  }

  /**
   * Generate usage analysis summary
   */
  public generateUsageAnalysisSummary(profiles: IUserUsageProfile[]): IUsageAnalysisSummary {
    const e5Users = profiles.filter(p => p.hasE5);
    const e5Underutilised = e5Users.filter(p => p.e5UtilisationPct < 30);
    const downgradeRecommendations = profiles.filter(p => p.canDowngrade);
    const totalSavings = downgradeRecommendations.reduce((sum, p) => sum + p.potentialAnnualSavings, 0);

    // Calculate average E5 utilisation
    const avgE5Util = e5Users.length > 0
      ? Math.round(e5Users.reduce((sum, p) => sum + p.e5UtilisationPct, 0) / e5Users.length)
      : 0;

    // Top unused E5 features
    const featureUnusedCounts: Record<string, number> = {};
    E5_EXCLUSIVE_FEATURES.forEach(f => { featureUnusedCounts[f.name] = 0; });

    e5Users.forEach(user => {
      user.e5FeaturesNotUsed.forEach(feature => {
        if (featureUnusedCounts[feature] !== undefined) {
          featureUnusedCounts[feature]++;
        }
      });
    });

    const topUnusedFeatures = Object.keys(featureUnusedCounts)
      .map(feature => ({
        feature,
        unusedCount: featureUnusedCounts[feature],
        pct: e5Users.length > 0 ? Math.round((featureUnusedCounts[feature] / e5Users.length) * 100) : 0
      }))
      .sort((a, b) => b.unusedCount - a.unusedCount)
      .slice(0, 5);

    // Department breakdown
    const deptMap = new Map<string, { e5Users: number; canDowngrade: number; savings: number }>();

    e5Users.forEach(user => {
      const dept = user.department || 'Unknown';
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { e5Users: 0, canDowngrade: 0, savings: 0 });
      }
      const d = deptMap.get(dept)!;
      d.e5Users++;
      if (user.canDowngrade) {
        d.canDowngrade++;
        d.savings += user.potentialAnnualSavings;
      }
    });

    const departmentBreakdown = Array.from(deptMap.entries())
      .map(([department, data]) => ({ department, ...data }))
      .sort((a, b) => b.savings - a.savings);

    return {
      totalUsersAnalysed: profiles.length,
      e5UsersCount: e5Users.length,
      e5UnderutilisedCount: e5Underutilised.length,
      e5UnderutilisedPct: e5Users.length > 0 ? Math.round((e5Underutilised.length / e5Users.length) * 100) : 0,
      averageE5UtilisationPct: avgE5Util,
      downgradeRecommendations: downgradeRecommendations.length,
      potentialAnnualSavings: totalSavings,
      topUnusedFeatures,
      departmentBreakdown
    };
  }

  /**
   * Generate feature usage statistics
   */
  public generateFeatureUsageStats(profiles: IUserUsageProfile[]): IFeatureUsageStats[] {
    const e5Users = profiles.filter(p => p.hasE5);
    if (e5Users.length === 0) return [];

    return E5_EXCLUSIVE_FEATURES.map(feature => {
      const usersUsing = e5Users.filter(u =>
        u.e5FeaturesUsed.indexOf(feature.name) >= 0
      ).length;

      return {
        featureId: feature.id,
        featureName: feature.name,
        category: feature.category,
        usersWithAccess: e5Users.length,
        usersActuallyUsing: usersUsing,
        utilisationPct: Math.round((usersUsing / e5Users.length) * 100),
        lastUsedByAnyone: null // Would need additional API calls
      };
    }).sort((a, b) => a.utilisationPct - b.utilisationPct);
  }
}

export default UsageReportService;
