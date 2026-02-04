/**
 * Comparison Service - V3 Feature
 * Provides month-over-month analysis and trend insights
 */

import {
  ILicenceSnapshot,
  IMonthComparison,
  IMonthComparisonData
} from '../models/ILicenceData';

export class ComparisonService {
  /**
   * Generate month-over-month comparison from snapshots
   */
  public generateMonthComparison(snapshots: ILicenceSnapshot[]): IMonthComparisonData | null {
    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    // Get unique snapshot dates and sort descending
    const uniqueDates = Array.from(new Set(snapshots.map(s => s.SnapshotDate)))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    if (uniqueDates.length < 2) {
      return null; // Need at least 2 months for comparison
    }

    const currentDate = uniqueDates[0];
    const previousDate = uniqueDates[1];

    const currentSnapshots = snapshots.filter(s => s.SnapshotDate === currentDate);
    const previousSnapshots = snapshots.filter(s => s.SnapshotDate === previousDate);

    // Calculate totals for each period
    const current = this.calculatePeriodTotals(currentSnapshots);
    const previous = this.calculatePeriodTotals(previousSnapshots);

    const comparisons: IMonthComparison[] = [];

    // Total Licensed Users
    comparisons.push(this.createComparison(
      'Total Licensed Users',
      previous.totalUsers,
      current.totalUsers,
      false // More users isn't necessarily bad or good
    ));

    // Total Assigned Licences
    comparisons.push(this.createComparison(
      'Assigned Licences',
      previous.totalAssigned,
      current.totalAssigned,
      false
    ));

    // Total Purchased Licences
    comparisons.push(this.createComparison(
      'Purchased Licences',
      previous.totalPurchased,
      current.totalPurchased,
      false
    ));

    // Overall Utilisation
    const prevUtil = previous.totalPurchased > 0 ? Math.round((previous.totalAssigned / previous.totalPurchased) * 100) : 0;
    const currUtil = current.totalPurchased > 0 ? Math.round((current.totalAssigned / current.totalPurchased) * 100) : 0;
    comparisons.push(this.createComparison(
      'Overall Utilisation',
      prevUtil,
      currUtil,
      true // Higher utilisation is generally positive
    ));

    // Disabled Accounts
    comparisons.push(this.createComparison(
      'Disabled Accounts',
      previous.disabledCount,
      current.disabledCount,
      false, // Fewer disabled accounts is positive (inverted)
      true   // Invert: decrease is positive
    ));

    // Inactive Users
    comparisons.push(this.createComparison(
      'Inactive Users (90+)',
      previous.inactiveCount,
      current.inactiveCount,
      false,
      true // Invert: decrease is positive
    ));

    // Dual-Licensed Users
    comparisons.push(this.createComparison(
      'Dual-Licensed Users',
      previous.dualCount,
      current.dualCount,
      false,
      true // Invert: decrease is positive
    ));

    // Total Issues
    const prevIssues = previous.disabledCount + previous.inactiveCount + previous.dualCount + previous.serviceCount;
    const currIssues = current.disabledCount + current.inactiveCount + current.dualCount + current.serviceCount;
    comparisons.push(this.createComparison(
      'Total Issues',
      prevIssues,
      currIssues,
      false,
      true // Invert: decrease is positive
    ));

    // Generate summary text
    const summaryText = this.generateSummaryText(comparisons, current, previous);

    return {
      currentMonth: this.formatMonthLabel(currentDate),
      previousMonth: this.formatMonthLabel(previousDate),
      comparisons,
      summaryText
    };
  }

  /**
   * Calculate period totals from snapshots
   */
  private calculatePeriodTotals(snapshots: ILicenceSnapshot[]): {
    totalUsers: number;
    totalAssigned: number;
    totalPurchased: number;
    disabledCount: number;
    inactiveCount: number;
    dualCount: number;
    serviceCount: number;
  } {
    // Use the first snapshot's user counts (they should be consistent across SKUs)
    const firstSnap: ILicenceSnapshot | undefined = snapshots[0];

    return {
      totalUsers: firstSnap ? firstSnap.TotalUsers || 0 : 0,
      totalAssigned: snapshots.reduce((sum, s) => sum + s.Assigned, 0),
      totalPurchased: snapshots.reduce((sum, s) => sum + s.Purchased, 0),
      disabledCount: firstSnap ? firstSnap.DisabledCount || 0 : 0,
      inactiveCount: firstSnap ? firstSnap.InactiveCount || 0 : 0,
      dualCount: firstSnap ? firstSnap.DualCount || 0 : 0,
      serviceCount: firstSnap ? firstSnap.ServiceCount || 0 : 0
    };
  }

  /**
   * Create a comparison object
   */
  private createComparison(
    metric: string,
    previousValue: number,
    currentValue: number,
    upIsPositive: boolean,
    invertPositive: boolean = false
  ): IMonthComparison {
    const change = currentValue - previousValue;
    const changePct = previousValue !== 0 ? Math.round((change / previousValue) * 100) : (currentValue > 0 ? 100 : 0);

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePct) < 1) {
      trend = 'stable';
    } else {
      trend = change > 0 ? 'up' : 'down';
    }

    // Determine if the trend is positive
    let isPositive: boolean;
    if (trend === 'stable') {
      isPositive = true; // Stable is neutral/positive
    } else if (invertPositive) {
      // For metrics where decrease is good (issues, disabled accounts)
      isPositive = trend === 'down';
    } else if (upIsPositive) {
      isPositive = trend === 'up';
    } else {
      // Neutral metrics - neither good nor bad
      isPositive = true;
    }

    return {
      metric,
      previousValue,
      currentValue,
      change,
      changePct,
      trend,
      isPositive
    };
  }

  /**
   * Format a date string as a month label
   */
  private formatMonthLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }

  /**
   * Generate a summary text describing the changes
   */
  private generateSummaryText(
    comparisons: IMonthComparison[],
    current: ReturnType<typeof this.calculatePeriodTotals>,
    previous: ReturnType<typeof this.calculatePeriodTotals>
  ): string {
    const parts: string[] = [];

    // User change
    const userComp = comparisons.find(c => c.metric === 'Total Licensed Users');
    if (userComp && userComp.trend !== 'stable') {
      parts.push(`Licensed users ${userComp.trend === 'up' ? 'increased' : 'decreased'} by ${Math.abs(userComp.change)} (${userComp.changePct > 0 ? '+' : ''}${userComp.changePct}%).`);
    }

    // Utilisation change
    const utilComp = comparisons.find(c => c.metric === 'Overall Utilisation');
    if (utilComp) {
      if (utilComp.trend === 'up') {
        parts.push(`Utilisation improved to ${utilComp.currentValue}%.`);
      } else if (utilComp.trend === 'down') {
        parts.push(`Utilisation dropped to ${utilComp.currentValue}%.`);
      } else {
        parts.push(`Utilisation remained stable at ${utilComp.currentValue}%.`);
      }
    }

    // Issues change
    const issuesComp = comparisons.find(c => c.metric === 'Total Issues');
    if (issuesComp && issuesComp.trend !== 'stable') {
      if (issuesComp.trend === 'down') {
        parts.push(`Great progress: ${Math.abs(issuesComp.change)} fewer issues to resolve.`);
      } else {
        parts.push(`${issuesComp.change} new issues identified requiring attention.`);
      }
    }

    // Disabled accounts specifically
    const disabledComp = comparisons.find(c => c.metric === 'Disabled Accounts');
    if (disabledComp && disabledComp.currentValue > 0) {
      if (disabledComp.trend === 'down') {
        parts.push(`Disabled accounts reduced from ${disabledComp.previousValue} to ${disabledComp.currentValue}.`);
      } else if (disabledComp.trend === 'up') {
        parts.push(`Warning: ${disabledComp.change} new disabled accounts with licences.`);
      }
    }

    return parts.join(' ') || 'No significant changes from last month.';
  }

  /**
   * Get trend direction for a specific metric
   */
  public getMetricTrend(comparisons: IMonthComparison[], metricName: string): IMonthComparison | undefined {
    return comparisons.find(c => c.metric === metricName);
  }

  /**
   * Check if overall trend is positive
   */
  public isOverallTrendPositive(comparisons: IMonthComparison[]): boolean {
    const positiveCount = comparisons.filter(c => c.isPositive).length;
    return positiveCount >= comparisons.length / 2;
  }

  /**
   * Get key highlights from comparison
   */
  public getKeyHighlights(comparisons: IMonthComparison[]): {
    improvements: IMonthComparison[];
    concerns: IMonthComparison[];
    stable: IMonthComparison[];
  } {
    return {
      improvements: comparisons.filter(c => c.isPositive && c.trend !== 'stable'),
      concerns: comparisons.filter(c => !c.isPositive && c.trend !== 'stable'),
      stable: comparisons.filter(c => c.trend === 'stable')
    };
  }
}

export default ComparisonService;
