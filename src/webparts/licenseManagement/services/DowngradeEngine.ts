/**
 * Downgrade Engine - V3 Feature
 * Identifies licence downgrade opportunities with accurate cost calculations
 *
 * Downgrade paths:
 * - E5 → E3: User not using E5-exclusive features (Defender, eDiscovery, Power BI Pro)
 * - E3 → F3: Frontline workers using basic features only
 * - E3 → Business Basic: Users only using Exchange + Teams
 * - Remove: Disabled/inactive accounts
 */

import {
  ILicenceUser,
  ILicenceSku,
  ILicencePricing,
  IDowngradeRecommendation,
  IDowngradeSummary,
  DowngradeType,
  IUserCostBreakdown
} from '../models/ILicenceData';
import { getSkuFriendlyName, classifySkuWithPurchased } from '../utils/SkuClassifier';
import { STANDARD_PRICING } from '../constants/Pricing';

// SKU part numbers for licence identification
const E5_SKUS = ['ENTERPRISEPREMIUM', 'SPE_E5', 'ENTERPRISEPREMIUM_NOPSTNCONF'];
const E3_SKUS = ['ENTERPRISEPACK', 'SPE_E3', 'ENTERPRISEPACKWITHOUTPROPLUS'];
const F3_SKUS = ['M365_F1_COMM', 'DESKLESSPACK', 'SPE_F1'];

export class DowngradeEngine {
  private pricing: Map<string, number> = new Map();
  private skuMap: Map<string, ILicenceSku> = new Map();

  /**
   * Initialise the engine with pricing and SKU data
   */
  public initialise(pricing: ILicencePricing[], skus: ILicenceSku[]): void {
    // Build pricing lookup (Title → MonthlyCostPerUser)
    this.pricing.clear();
    pricing.forEach(p => {
      this.pricing.set(p.Title, p.MonthlyCostPerUser);
      this.pricing.set(p.Title.toLowerCase(), p.MonthlyCostPerUser);
    });

    // Build SKU lookup (Title and SkuPartNumber → SKU)
    this.skuMap.clear();
    skus.forEach(s => {
      this.skuMap.set(s.Title, s);
      this.skuMap.set(s.Title.toLowerCase(), s);
      this.skuMap.set(s.SkuPartNumber, s);
      this.skuMap.set(s.SkuPartNumber.toLowerCase(), s);
    });
  }

  /**
   * Get the monthly cost for a licence name
   * Uses multiple fallback strategies for accurate pricing
   */
  public getLicenceCost(licenceName: string): { cost: number; source: 'direct' | 'sku_lookup' | 'friendly_name' | 'standard' | 'not_found' } {
    if (!licenceName || licenceName.trim() === '') {
      return { cost: 0, source: 'not_found' };
    }

    const trimmedName = licenceName.trim();

    // Strategy 1: Direct title match
    if (this.pricing.has(trimmedName)) {
      return { cost: this.pricing.get(trimmedName)!, source: 'direct' };
    }

    // Strategy 2: Case-insensitive match
    if (this.pricing.has(trimmedName.toLowerCase())) {
      return { cost: this.pricing.get(trimmedName.toLowerCase())!, source: 'direct' };
    }

    // Strategy 3: SKU lookup - find SKU by title or part number, then get pricing
    const sku = this.skuMap.get(trimmedName) || this.skuMap.get(trimmedName.toLowerCase());
    if (sku) {
      // Try SKU title
      if (this.pricing.has(sku.Title)) {
        return { cost: this.pricing.get(sku.Title)!, source: 'sku_lookup' };
      }
      // Try friendly name from classifier
      const friendlyName = getSkuFriendlyName(sku.SkuPartNumber);
      if (this.pricing.has(friendlyName)) {
        return { cost: this.pricing.get(friendlyName)!, source: 'friendly_name' };
      }
    }

    // Strategy 4: Try friendly name directly
    const directFriendlyName = getSkuFriendlyName(trimmedName);
    if (directFriendlyName !== trimmedName && this.pricing.has(directFriendlyName)) {
      return { cost: this.pricing.get(directFriendlyName)!, source: 'friendly_name' };
    }

    // Strategy 5: Standard pricing fallback - only if licence name contains full standard name
    const standardNames = Object.keys(STANDARD_PRICING);
    for (let i = 0; i < standardNames.length; i++) {
      const name = standardNames[i];
      const cost = STANDARD_PRICING[name];
      if (trimmedName.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
        return { cost, source: 'standard' };
      }
    }

    // Not found - return 0 with flag
    return { cost: 0, source: 'not_found' };
  }

  /**
   * Calculate detailed cost breakdown for a user
   * This is the AUTHORITATIVE costing method - all other calculations should use this
   */
  public getUserCostBreakdown(user: ILicenceUser): IUserCostBreakdown {
    const licenceNames = user.Licences.split(',').map(l => l.trim()).filter(l => l);

    const licences = licenceNames.map(name => {
      const sku = this.skuMap.get(name) || this.skuMap.get(name.toLowerCase());
      // Exclude free/viral SKUs from costing
      if (sku) {
        const classification = classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned);
        if (classification.isExcludedFromAggregates) {
          return {
            name,
            skuPartNumber: sku.SkuPartNumber,
            monthlyCost: 0,
            annualCost: 0,
            pricingSource: 'not_found' as 'direct' | 'sku_lookup' | 'friendly_name' | 'not_found'
          };
        }
      }
      const { cost, source } = this.getLicenceCost(name);
      return {
        name,
        skuPartNumber: sku?.SkuPartNumber,
        monthlyCost: cost,
        annualCost: cost * 12,
        pricingSource: source as 'direct' | 'sku_lookup' | 'friendly_name' | 'not_found'
      };
    });

    const totalMonthlyCost = licences.reduce((sum, l) => sum + l.monthlyCost, 0);

    // Calculate savings based on issue type
    let potentialMonthlySavings = 0;
    let savingsReason: string | undefined;

    switch (user.IssueType) {
      case 'Disabled':
        potentialMonthlySavings = totalMonthlyCost;
        savingsReason = 'Remove all licences from disabled account';
        break;

      case 'Dual-Licensed':
        // Keep the most expensive paid licence, save the rest
        if (licences.length > 1) {
          const paidLicences = licences.filter(function(l) { return l.monthlyCost > 0; });
          if (paidLicences.length > 1) {
            const sorted = [...paidLicences].sort((a, b) => b.monthlyCost - a.monthlyCost);
            potentialMonthlySavings = sorted.slice(1).reduce((sum, l) => sum + l.monthlyCost, 0);
            savingsReason = `Remove redundant licence(s), keep ${sorted[0].name}`;
          }
        }
        break;

      case 'Inactive 90+':
        potentialMonthlySavings = totalMonthlyCost;
        savingsReason = 'Review and potentially remove all licences (90+ days inactive)';
        break;

      case 'Service Account':
        // Service accounts need review, not automatic removal
        potentialMonthlySavings = 0;
        savingsReason = 'Service account - review licence necessity';
        break;

      default:
        potentialMonthlySavings = 0;
    }

    return {
      userId: user.Id,
      userName: user.Title,
      licences,
      totalMonthlyCost,
      totalAnnualCost: totalMonthlyCost * 12,
      potentialMonthlySavings,
      potentialAnnualSavings: potentialMonthlySavings * 12,
      issueType: user.IssueType,
      savingsReason
    };
  }

  /**
   * Check if a user has a specific licence tier
   */
  private hasLicenceTier(user: ILicenceUser, skuPatterns: string[]): boolean {
    const licences = user.Licences.toLowerCase();
    return skuPatterns.some(pattern => {
      const lowerPattern = pattern.toLowerCase();
      if (licences.includes(lowerPattern)) return true;
      // Also check friendly names
      const friendlyName = getSkuFriendlyName(pattern).toLowerCase();
      return licences.includes(friendlyName);
    });
  }

  /**
   * Generate downgrade recommendations for all users
   */
  public generateDowngradeRecommendations(users: ILicenceUser[]): IDowngradeRecommendation[] {
    const recommendations: IDowngradeRecommendation[] = [];

    users.forEach(user => {
      // Skip users with existing issues - they're already tracked
      if (user.IssueType !== 'None') return;

      // Skip service accounts
      if (user.IsServiceAccount) return;

      const hasE5 = this.hasLicenceTier(user, E5_SKUS) || user.HasE5;
      const hasE3 = this.hasLicenceTier(user, E3_SKUS) || user.HasE3;

      // E5 → E3 recommendation (if user has E5 and is not fully utilising it)
      // In V3, this would be enhanced with actual usage data
      // For now, we flag users with E5 who show low activity
      if (hasE5 && user.DaysSinceSignIn > 30 && user.DaysSinceSignIn < 90) {
        const e5Cost = this.getLicenceCost('Microsoft 365 E5').cost || STANDARD_PRICING['Microsoft 365 E5'];
        const e3Cost = this.getLicenceCost('Microsoft 365 E3').cost || STANDARD_PRICING['Microsoft 365 E3'];
        const monthlySavings = e5Cost - e3Cost;

        recommendations.push({
          userId: user.Id,
          userName: user.Title,
          userEmail: user.UserPrincipalName,
          department: user.Department,
          currentLicence: 'Microsoft 365 E5',
          recommendedLicence: 'Microsoft 365 E3',
          downgradeType: 'E5→E3',
          reason: `Reduced sign-in activity (${user.DaysSinceSignIn} days since last sign-in). Review E5 feature usage before downgrading.`,
          monthlySavings,
          annualSavings: monthlySavings * 12,
          confidence: user.DaysSinceSignIn > 60 ? 'high' : 'medium'
        });
      }

      // E3 → F3 recommendation for potential frontline workers
      // Flag users with E3 in certain departments that might be frontline
      if (hasE3 && !hasE5) {
        const frontlineDepts = ['retail', 'store', 'warehouse', 'logistics', 'call center', 'call centre', 'customer service'];
        const deptLower = (user.Department || '').toLowerCase();
        const isFrontlineCandidate = frontlineDepts.some(d => deptLower.includes(d));

        if (isFrontlineCandidate) {
          const e3Cost = this.getLicenceCost('Microsoft 365 E3').cost || STANDARD_PRICING['Microsoft 365 E3'];
          const f3Cost = this.getLicenceCost('Microsoft 365 F3').cost || STANDARD_PRICING['Microsoft 365 F3'];
          const monthlySavings = e3Cost - f3Cost;

          recommendations.push({
            userId: user.Id,
            userName: user.Title,
            userEmail: user.UserPrincipalName,
            department: user.Department,
            currentLicence: 'Microsoft 365 E3',
            recommendedLicence: 'Microsoft 365 F3',
            downgradeType: 'E3→F3',
            reason: `Department suggests frontline worker role - F3 may be sufficient`,
            monthlySavings,
            annualSavings: monthlySavings * 12,
            confidence: 'low' // Needs verification
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * Group recommendations by type for summary display
   */
  public summariseDowngrades(recommendations: IDowngradeRecommendation[]): IDowngradeSummary[] {
    const groups = new Map<DowngradeType, IDowngradeRecommendation[]>();

    recommendations.forEach(r => {
      if (!groups.has(r.downgradeType)) {
        groups.set(r.downgradeType, []);
      }
      groups.get(r.downgradeType)!.push(r);
    });

    const summaries: IDowngradeSummary[] = [];

    const descriptions: Record<DowngradeType, string> = {
      'E5→E3': 'Users with E5 who may not need premium features',
      'E3→F3': 'Knowledge workers who could move to frontline licences',
      'E3→Business Basic': 'Users only using basic Exchange and Teams',
      'Remove Licence': 'Licences that can be completely removed'
    };

    groups.forEach((users, type) => {
      summaries.push({
        type,
        count: users.length,
        users,
        totalMonthlySavings: users.reduce((sum, u) => sum + u.monthlySavings, 0),
        totalAnnualSavings: users.reduce((sum, u) => sum + u.annualSavings, 0),
        description: descriptions[type]
      });
    });

    // Sort by potential savings
    return summaries.sort((a, b) => b.totalAnnualSavings - a.totalAnnualSavings);
  }

  /**
   * Get total downgrade opportunity value
   */
  public getTotalDowngradeValue(recommendations: IDowngradeRecommendation[]): {
    monthlyTotal: number;
    annualTotal: number;
    userCount: number;
  } {
    return {
      monthlyTotal: recommendations.reduce((sum, r) => sum + r.monthlySavings, 0),
      annualTotal: recommendations.reduce((sum, r) => sum + r.annualSavings, 0),
      userCount: recommendations.length
    };
  }
}

export default DowngradeEngine;
