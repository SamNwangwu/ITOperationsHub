/**
 * Alert Service - V3 Feature
 * Generates proactive alerts based on licence data analysis
 *
 * Alert Categories:
 * - Capacity: Over-allocated, near capacity, under-utilised
 * - Cost: High savings opportunities, budget thresholds
 * - Compliance: Disabled accounts, inactive users
 * - Renewal: Upcoming contract renewals
 * - Action: Pending bulk actions, review needed
 */

import {
  ILicenceDashboardData,
  IKpiSummary,
  ILicenceSku,
  ILicencePricing,
  IAlert,
  AlertSeverity,
  AlertCategory,
  IDowngradeRecommendation
} from '../models/ILicenceData';

export class AlertService {
  private alerts: IAlert[] = [];

  /**
   * Generate all alerts from dashboard data
   */
  public generateAlerts(
    data: ILicenceDashboardData,
    kpi: IKpiSummary,
    downgradeRecommendations?: IDowngradeRecommendation[]
  ): IAlert[] {
    this.alerts = [];

    // Capacity alerts
    this.checkCapacityAlerts(data.skus);

    // Cost alerts
    this.checkCostAlerts(kpi, downgradeRecommendations);

    // Compliance alerts
    this.checkComplianceAlerts(kpi);

    // Renewal alerts
    this.checkRenewalAlerts(data.pricing);

    // Sort by severity (critical first)
    const severityOrder: Record<AlertSeverity, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3
    };
    this.alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return this.alerts;
  }

  /**
   * Check for capacity-related alerts
   */
  private checkCapacityAlerts(skus: ILicenceSku[]): void {
    // Over-allocated licences (critical)
    const overAllocated = skus.filter(s => s.Assigned > s.Purchased);
    if (overAllocated.length > 0) {
      const totalOver = overAllocated.reduce((sum, s) => sum + (s.Assigned - s.Purchased), 0);
      this.addAlert({
        severity: 'critical',
        category: 'capacity',
        title: `${overAllocated.length} licence type(s) over-allocated`,
        description: `${totalOver} more licences assigned than purchased. This may cause compliance issues.`,
        metric: `+${totalOver} over`,
        actionLabel: 'View Details',
        actionType: 'navigate',
        actionTarget: 'utilisation'
      });
    }

    // Near capacity (warning) - 90%+ utilisation
    const nearCapacity = skus.filter(s => s.UtilisationPct >= 90 && s.UtilisationPct < 100 && s.Purchased >= 10);
    if (nearCapacity.length > 0) {
      const mostCritical = nearCapacity.sort((a, b) => b.UtilisationPct - a.UtilisationPct)[0];
      this.addAlert({
        severity: 'warning',
        category: 'capacity',
        title: `${mostCritical.Title} at ${mostCritical.UtilisationPct}% capacity`,
        description: `Only ${mostCritical.Purchased - mostCritical.Assigned} licences remaining. Consider purchasing more.`,
        metric: `${mostCritical.Purchased - mostCritical.Assigned} left`,
        actionLabel: 'Review Allocation',
        actionType: 'navigate',
        actionTarget: 'utilisation'
      });
    }

    // Significantly under-utilised (info) - <50% with 10+ purchased
    const underUtilised = skus.filter(s => s.UtilisationPct < 50 && s.Purchased >= 10);
    if (underUtilised.length > 0) {
      const totalUnused = underUtilised.reduce((sum, s) => sum + (s.Purchased - s.Assigned), 0);
      this.addAlert({
        severity: 'info',
        category: 'capacity',
        title: `${totalUnused} purchased licences unused`,
        description: `${underUtilised.length} licence type(s) below 50% utilisation. Consider reducing at renewal.`,
        metric: `${totalUnused} unused`,
        actionLabel: 'View Under-utilised',
        actionType: 'navigate',
        actionTarget: 'utilisation'
      });
    }
  }

  /**
   * Check for cost-related alerts
   */
  private checkCostAlerts(kpi: IKpiSummary, downgradeRecommendations?: IDowngradeRecommendation[]): void {
    // High savings opportunity (critical if > £50k annual)
    if (kpi.potentialAnnualSavings >= 50000) {
      this.addAlert({
        severity: 'critical',
        category: 'cost',
        title: `£${Math.round(kpi.potentialAnnualSavings).toLocaleString()} annual savings identified`,
        description: `Significant cost reduction available from ${kpi.issuesCount} licence issues.`,
        metric: `£${Math.round(kpi.potentialAnnualSavings).toLocaleString()}`,
        actionLabel: 'View Opportunities',
        actionType: 'navigate',
        actionTarget: 'issues'
      });
    } else if (kpi.potentialAnnualSavings >= 10000) {
      this.addAlert({
        severity: 'warning',
        category: 'cost',
        title: `£${Math.round(kpi.potentialAnnualSavings).toLocaleString()} potential savings`,
        description: `Cost optimisation opportunities identified from licence issues.`,
        metric: `£${Math.round(kpi.potentialAnnualSavings).toLocaleString()}`,
        actionLabel: 'Review Issues',
        actionType: 'navigate',
        actionTarget: 'issues'
      });
    }

    // Downgrade opportunities
    if (downgradeRecommendations && downgradeRecommendations.length > 0) {
      const totalDowngradeSavings = downgradeRecommendations.reduce((sum, r) => sum + r.annualSavings, 0);
      if (totalDowngradeSavings >= 5000) {
        this.addAlert({
          severity: 'info',
          category: 'cost',
          title: `${downgradeRecommendations.length} downgrade candidates`,
          description: `Potential £${Math.round(totalDowngradeSavings).toLocaleString()} annual savings from licence rightsizing.`,
          metric: `${downgradeRecommendations.length} users`,
          actionLabel: 'View Recommendations',
          actionType: 'navigate',
          actionTarget: 'optimisation'
        });
      }
    }

    // High spend percentage (savings > 15% of spend)
    if (kpi.monthlySpend > 0) {
      const savingsPct = (kpi.potentialMonthlySavings / kpi.monthlySpend) * 100;
      if (savingsPct >= 15) {
        this.addAlert({
          severity: 'warning',
          category: 'cost',
          title: `${Math.round(savingsPct)}% of licence spend could be saved`,
          description: `£${Math.round(kpi.potentialMonthlySavings).toLocaleString()}/month of £${Math.round(kpi.monthlySpend).toLocaleString()} total spend.`,
          metric: `${Math.round(savingsPct)}%`,
          actionLabel: 'Optimise Now',
          actionType: 'navigate',
          actionTarget: 'issues'
        });
      }
    }
  }

  /**
   * Check for compliance-related alerts
   */
  private checkComplianceAlerts(kpi: IKpiSummary): void {
    // Disabled accounts with licences (critical)
    if (kpi.disabledCount > 0) {
      this.addAlert({
        severity: 'critical',
        category: 'compliance',
        title: `${kpi.disabledCount} disabled accounts holding licences`,
        description: `Licences assigned to disabled accounts should be removed immediately.`,
        metric: `${kpi.disabledCount} accounts`,
        actionLabel: 'Remove Licences',
        actionType: 'navigate',
        actionTarget: 'issues'
      });
    }

    // Dual-licensed users (warning)
    if (kpi.dualLicensedCount > 0) {
      this.addAlert({
        severity: 'warning',
        category: 'compliance',
        title: `${kpi.dualLicensedCount} users with duplicate licences`,
        description: `Users have both E3 and E5 assigned - only E5 is needed.`,
        metric: `${kpi.dualLicensedCount} users`,
        actionLabel: 'Fix Duplicates',
        actionType: 'navigate',
        actionTarget: 'issues'
      });
    }

    // High inactive user count (warning if > 10% of users)
    const inactivePct = (kpi.inactiveCount / kpi.totalLicensedUsers) * 100;
    if (kpi.inactiveCount >= 10 && inactivePct >= 5) {
      this.addAlert({
        severity: 'warning',
        category: 'compliance',
        title: `${kpi.inactiveCount} users inactive for 90+ days`,
        description: `${Math.round(inactivePct)}% of licensed users haven't signed in recently.`,
        metric: `${kpi.inactiveCount} users`,
        actionLabel: 'Review Inactive',
        actionType: 'navigate',
        actionTarget: 'issues'
      });
    }

    // Low active user percentage (info)
    if (kpi.activeUsersPct < 75) {
      this.addAlert({
        severity: 'info',
        category: 'compliance',
        title: `Only ${kpi.activeUsersPct}% of users are active`,
        description: `Consider reviewing licence assignments for inactive users.`,
        metric: `${kpi.activeUsersPct}% active`,
        actionLabel: 'View Activity',
        actionType: 'navigate',
        actionTarget: 'users'
      });
    }
  }

  /**
   * Check for renewal-related alerts
   */
  private checkRenewalAlerts(pricing: ILicencePricing[]): void {
    const now = new Date();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    pricing.forEach(p => {
      if (!p.RenewalDate) return;

      const renewalDate = new Date(p.RenewalDate);
      const daysUntil = Math.floor((renewalDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysUntil <= 0) return; // Past renewals

      if (daysUntil <= 30) {
        this.addAlert({
          severity: 'critical',
          category: 'renewal',
          title: `${p.Title} renewal in ${daysUntil} days`,
          description: `Contract renewal on ${renewalDate.toLocaleDateString('en-GB')}. Review licence counts.`,
          metric: `${daysUntil} days`,
          actionLabel: 'Review Contract',
          actionType: 'navigate',
          actionTarget: 'costs'
        });
      } else if (daysUntil <= 90) {
        this.addAlert({
          severity: 'warning',
          category: 'renewal',
          title: `${p.Title} renewal approaching`,
          description: `Contract renewal on ${renewalDate.toLocaleDateString('en-GB')} (${daysUntil} days).`,
          metric: `${daysUntil} days`,
          actionLabel: 'Plan Renewal',
          actionType: 'navigate',
          actionTarget: 'costs'
        });
      }
    });
  }

  /**
   * Add an alert to the list
   */
  private addAlert(alert: Omit<IAlert, 'id' | 'createdAt'>): void {
    this.alerts.push({
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    });
  }

  /**
   * Get alerts by severity
   */
  public getAlertsBySeverity(alerts: IAlert[], severity: AlertSeverity): IAlert[] {
    return alerts.filter(a => a.severity === severity);
  }

  /**
   * Get alerts by category
   */
  public getAlertsByCategory(alerts: IAlert[], category: AlertCategory): IAlert[] {
    return alerts.filter(a => a.category === category);
  }

  /**
   * Get alert counts by severity
   */
  public getAlertCounts(alerts: IAlert[]): Record<AlertSeverity, number> {
    return {
      critical: alerts.filter(a => a.severity === 'critical').length,
      warning: alerts.filter(a => a.severity === 'warning').length,
      info: alerts.filter(a => a.severity === 'info').length,
      success: alerts.filter(a => a.severity === 'success').length
    };
  }
}

export default AlertService;
