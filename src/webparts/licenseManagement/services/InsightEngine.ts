import {
  ILicenceDashboardData,
  IKpiSummary,
  ILicenceSnapshot,
  ILicenceSku,
  ILicenceUser
} from '../models/ILicenceData';
import { classifySkuWithPurchased } from '../utils/SkuClassifier';

export interface IInsight {
  id: string;
  type: 'success' | 'warning' | 'critical' | 'info';
  title: string;
  description: string;
  metric?: string;
  trend?: 'up' | 'down' | 'stable';
  action?: string;
}

/**
 * Engine for generating AI-style insights from licence data
 * Analyzes trends, anomalies, and optimization opportunities
 */
export class InsightEngine {

  /**
   * Generate all insights from dashboard data
   */
  public generateInsights(data: ILicenceDashboardData, kpi: IKpiSummary): IInsight[] {
    const insights: IInsight[] = [];

    // Utilisation insights
    insights.push(...this.analyzeUtilisation(data.skus, kpi));

    // Cost savings insights
    insights.push(...this.analyzeSavings(kpi));

    // Issue insights
    insights.push(...this.analyzeIssues(data.users, kpi));

    // Trend insights (if we have snapshots)
    if (data.snapshots.length > 0) {
      insights.push(...this.analyzeTrends(data.snapshots));
    }

    // Department insights
    insights.push(...this.analyzeDepartments(data.users));

    // Sort by priority (critical first, then warning, then info)
    const priorityOrder = { critical: 0, warning: 1, info: 2, success: 3 };
    insights.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

    return insights.slice(0, 6); // Return top 6 insights
  }

  /**
   * Generate executive summary paragraph
   */
  public generateExecutiveSummary(data: ILicenceDashboardData, kpi: IKpiSummary): string {
    const parts: string[] = [];

    // Overall health assessment
    if (kpi.overallUtilisationPct >= 90) {
      parts.push(`Licence utilisation is healthy at ${kpi.overallUtilisationPct}%.`);
    } else if (kpi.overallUtilisationPct >= 70) {
      parts.push(`Licence utilisation is ${kpi.overallUtilisationPct}%, with room for optimisation.`);
    } else {
      parts.push(`Licence utilisation is low at ${kpi.overallUtilisationPct}%, indicating significant over-provisioning.`);
    }

    // Active users
    parts.push(`${kpi.activeUsersPct}% of licensed users are active (signed in within 90 days).`);

    // Issues summary
    if (kpi.issuesCount > 0) {
      const issueDetails: string[] = [];
      if (kpi.disabledCount > 0) issueDetails.push(`${kpi.disabledCount} disabled accounts`);
      if (kpi.dualLicensedCount > 0) issueDetails.push(`${kpi.dualLicensedCount} dual-licensed users`);
      if (kpi.inactiveCount > 0) issueDetails.push(`${kpi.inactiveCount} inactive users`);

      parts.push(`${kpi.issuesCount} issues identified: ${issueDetails.join(', ')}.`);
    } else {
      parts.push('No licence issues detected.');
    }

    // Savings opportunity
    if (kpi.potentialAnnualSavings > 0) {
      parts.push(`Potential annual savings of £${kpi.potentialAnnualSavings.toLocaleString()} identified.`);
    }

    return parts.join(' ');
  }

  /**
   * Analyze utilisation patterns
   */
  private analyzeUtilisation(skus: ILicenceSku[], kpi: IKpiSummary): IInsight[] {
    const insights: IInsight[] = [];

    // Only analyse paid SKUs
    const paidSkus = skus.filter(function(s) {
      return !classifySkuWithPurchased(s.SkuPartNumber, s.Purchased, s.Assigned).isExcludedFromAggregates;
    });

    // Over-allocated SKUs (only paid, exclude Purchased=0 bundled SKUs)
    const overAllocated = paidSkus.filter(s => s.Purchased > 0 && s.Assigned > s.Purchased);
    if (overAllocated.length > 0) {
      insights.push({
        id: 'over-allocated',
        type: 'critical',
        title: 'Over-Allocated Licences',
        description: `${overAllocated.length} licence type(s) have more assignments than purchased seats: ${overAllocated.map(s => s.Title).join(', ')}`,
        action: 'Purchase additional licences or remove assignments'
      });
    }

    // Under-utilised SKUs (< 70%)
    const underUtilised = paidSkus.filter(s => s.UtilisationPct < 70 && s.Purchased >= 10);
    if (underUtilised.length > 0) {
      const totalWasted = underUtilised.reduce((sum, s) => sum + s.Available, 0);
      insights.push({
        id: 'under-utilised',
        type: 'warning',
        title: 'Under-Utilised Licences',
        description: `${underUtilised.length} licence type(s) below 70% utilisation with ${totalWasted} unused seats`,
        metric: `${totalWasted} seats`,
        action: 'Review and reduce licence allocation at next renewal'
      });
    }

    // Well-optimised
    if (kpi.overallUtilisationPct >= 85 && overAllocated.length === 0) {
      insights.push({
        id: 'well-optimised',
        type: 'success',
        title: 'Healthy Utilisation',
        description: `Overall licence utilisation is ${kpi.overallUtilisationPct}% - well optimised`,
        metric: `${kpi.overallUtilisationPct}%`
      });
    }

    return insights;
  }

  /**
   * Analyze cost savings opportunities
   */
  private analyzeSavings(kpi: IKpiSummary): IInsight[] {
    const insights: IInsight[] = [];

    if (kpi.potentialAnnualSavings >= 10000) {
      insights.push({
        id: 'major-savings',
        type: 'critical',
        title: 'Significant Savings Available',
        description: `£${kpi.potentialAnnualSavings.toLocaleString()} potential annual savings from licence optimisation`,
        metric: `£${kpi.potentialAnnualSavings.toLocaleString()}`,
        action: 'Review and action the issues identified'
      });
    } else if (kpi.potentialAnnualSavings >= 1000) {
      insights.push({
        id: 'moderate-savings',
        type: 'warning',
        title: 'Savings Opportunity',
        description: `£${kpi.potentialAnnualSavings.toLocaleString()} annual savings possible`,
        metric: `£${kpi.potentialAnnualSavings.toLocaleString()}`
      });
    }

    // Monthly spend context
    if (kpi.monthlySpend > 0) {
      const savingsPct = Math.round((kpi.potentialMonthlySavings / kpi.monthlySpend) * 100);
      if (savingsPct >= 10) {
        insights.push({
          id: 'savings-pct',
          type: 'info',
          title: 'Cost Reduction Potential',
          description: `${savingsPct}% of monthly licence spend (£${kpi.monthlySpend.toLocaleString()}) could be saved`,
          metric: `${savingsPct}%`
        });
      }
    }

    return insights;
  }

  /**
   * Analyze licence issues
   */
  private analyzeIssues(users: ILicenceUser[], kpi: IKpiSummary): IInsight[] {
    const insights: IInsight[] = [];

    // Disabled accounts with licences
    if (kpi.disabledCount > 0) {
      insights.push({
        id: 'disabled-accounts',
        type: 'critical',
        title: 'Disabled Accounts Holding Licences',
        description: `${kpi.disabledCount} disabled accounts still have licences assigned`,
        metric: `${kpi.disabledCount} users`,
        action: 'Remove licences from disabled accounts'
      });
    }

    // Dual-licensed users
    if (kpi.dualLicensedCount > 0) {
      insights.push({
        id: 'dual-licensed',
        type: 'warning',
        title: 'Dual-Licensed Users',
        description: `${kpi.dualLicensedCount} users have both E3 and E5 licences (only E5 needed)`,
        metric: `${kpi.dualLicensedCount} users`,
        action: 'Remove E3 licences from E5 users'
      });
    }

    // Inactive users
    if (kpi.inactiveCount > 10) {
      insights.push({
        id: 'inactive-users',
        type: 'warning',
        title: 'Inactive Licensed Users',
        description: `${kpi.inactiveCount} users haven't signed in for 90+ days but have licences`,
        metric: `${kpi.inactiveCount} users`,
        action: 'Review and potentially revoke licences'
      });
    }

    // Low activity rate
    if (kpi.activeUsersPct < 80) {
      insights.push({
        id: 'low-activity',
        type: 'info',
        title: 'User Activity Below Target',
        description: `Only ${kpi.activeUsersPct}% of licensed users are actively using their licences`,
        metric: `${kpi.activeUsersPct}%`,
        trend: 'down'
      });
    }

    return insights;
  }

  /**
   * Analyze trends from historical snapshots
   */
  private analyzeTrends(snapshots: ILicenceSnapshot[]): IInsight[] {
    const insights: IInsight[] = [];

    // Get the last two snapshots for comparison
    const sortedSnapshots = [...snapshots].sort(
      (a, b) => new Date(b.SnapshotDate).getTime() - new Date(a.SnapshotDate).getTime()
    );

    const uniqueDates = Array.from(new Set(sortedSnapshots.map(s => s.SnapshotDate)));
    if (uniqueDates.length < 2) return insights;

    const currentMonth = sortedSnapshots.filter(s => s.SnapshotDate === uniqueDates[0]);
    const previousMonth = sortedSnapshots.filter(s => s.SnapshotDate === uniqueDates[1]);

    // Total assigned change
    const currentAssigned = currentMonth.reduce((sum, s) => sum + s.Assigned, 0);
    const previousAssigned = previousMonth.reduce((sum, s) => sum + s.Assigned, 0);
    const assignedChange = currentAssigned - previousAssigned;

    if (Math.abs(assignedChange) >= 10) {
      insights.push({
        id: 'assignment-trend',
        type: assignedChange > 0 ? 'info' : 'success',
        title: assignedChange > 0 ? 'Licence Growth' : 'Licence Reduction',
        description: `${Math.abs(assignedChange)} ${assignedChange > 0 ? 'more' : 'fewer'} licences assigned compared to last month`,
        metric: `${assignedChange > 0 ? '+' : ''}${assignedChange}`,
        trend: assignedChange > 0 ? 'up' : 'down'
      });
    }

    // Issue count change
    const currentIssues = currentMonth.reduce((sum, s) => sum + s.DisabledCount + s.InactiveCount + s.DualCount, 0);
    const previousIssues = previousMonth.reduce((sum, s) => sum + s.DisabledCount + s.InactiveCount + s.DualCount, 0);
    const issueChange = currentIssues - previousIssues;

    if (issueChange < -5) {
      insights.push({
        id: 'issues-improving',
        type: 'success',
        title: 'Issues Decreasing',
        description: `${Math.abs(issueChange)} fewer licence issues than last month`,
        metric: `${issueChange}`,
        trend: 'down'
      });
    } else if (issueChange > 5) {
      insights.push({
        id: 'issues-increasing',
        type: 'warning',
        title: 'Issues Increasing',
        description: `${issueChange} more licence issues than last month`,
        metric: `+${issueChange}`,
        trend: 'up'
      });
    }

    return insights;
  }

  /**
   * Analyze department distribution
   */
  private analyzeDepartments(users: ILicenceUser[]): IInsight[] {
    const insights: IInsight[] = [];

    // Group by department
    const deptMap = new Map<string, ILicenceUser[]>();
    users.forEach(u => {
      const dept = u.Department || 'Unknown';
      if (!deptMap.has(dept)) deptMap.set(dept, []);
      deptMap.get(dept)!.push(u);
    });

    // Find department with highest issue rate
    let worstDept = '';
    let worstRate = 0;

    deptMap.forEach((deptUsers, dept) => {
      if (deptUsers.length >= 10) {
        const issueCount = deptUsers.filter(u => u.IssueType !== 'None').length;
        const issueRate = issueCount / deptUsers.length;
        if (issueRate > worstRate) {
          worstRate = issueRate;
          worstDept = dept;
        }
      }
    });

    if (worstRate >= 0.2 && worstDept) {
      const pct = Math.round(worstRate * 100);
      insights.push({
        id: 'dept-issues',
        type: 'info',
        title: 'Department Attention Needed',
        description: `${worstDept} has ${pct}% of users with licence issues`,
        metric: `${pct}%`,
        action: `Review ${worstDept} licence assignments`
      });
    }

    return insights;
  }

  /**
   * Get a specific insight by ID
   */
  public getInsightById(insights: IInsight[], id: string): IInsight | undefined {
    return insights.find(i => i.id === id);
  }
}

export default InsightEngine;
