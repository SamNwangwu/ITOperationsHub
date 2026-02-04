/**
 * SKU Classifier Utility
 * Categorises M365 SKUs into tiers, provides friendly names, and identifies viral/free SKUs
 * that should be excluded from aggregate KPIs.
 */

export type SkuTier = 'core-paid' | 'add-on' | 'free' | 'viral';

export interface ISkuClassification {
  tier: SkuTier;
  friendlyName: string;
  isExcludedFromAggregates: boolean;
}

/**
 * Maps SkuPartNumber to human-readable friendly names.
 * Full names used for consistency with LicencePricing list.
 */
const SKU_FRIENDLY_NAMES: Record<string, string> = {
  // Core Paid - Enterprise
  'ENTERPRISEPREMIUM': 'Microsoft 365 E5',
  'ENTERPRISEPREMIUM_NOPSTNCONF': 'Microsoft 365 E5 (No Audio Conf)',
  'SPE_E5': 'Microsoft 365 E5',
  'ENTERPRISEPACK': 'Microsoft 365 E3',
  'SPE_E3': 'Microsoft 365 E3',
  'ENTERPRISEPACKWITHOUTPROPLUS': 'Office 365 E3 (No ProPlus)',
  'ENTERPRISEWITHSCAL': 'Office 365 E4',

  // Core Paid - Frontline
  'SPE_F1': 'Microsoft 365 F1',
  'M365_F1_COMM': 'Microsoft 365 F3',
  'DESKLESSPACK': 'Office 365 F3',
  'SPB': 'Microsoft 365 Business Premium',
  'O365_BUSINESS_ESSENTIALS': 'Microsoft 365 Business Basic',
  'O365_BUSINESS_PREMIUM': 'Microsoft 365 Business Standard',
  'SMB_BUSINESS': 'Microsoft 365 Apps for Business',

  // Core Paid - Apps
  'OFFICESUBSCRIPTION': 'Microsoft 365 Apps for Enterprise',
  'O365_BUSINESS': 'Microsoft 365 Apps for Business',

  // Add-ons
  'MICROSOFT_COPILOT_STUDIO': 'Copilot Studio',
  'Microsoft_Copilot_for_M365': 'Copilot for Microsoft 365',
  'VISIOCLIENT': 'Visio Plan 2',
  'PROJECTPREMIUM': 'Project Plan 5',
  'PROJECTPROFESSIONAL': 'Project Plan 3',
  'POWER_BI_PRO': 'Power BI Pro',
  'PBI_PREMIUM_PER_USER': 'Power BI Premium Per User',
  'POWERAPPS_PER_USER': 'Power Apps Per User',
  'FLOW_PER_USER': 'Power Automate Per User',
  'ATP_ENTERPRISE': 'Defender for Office 365 P1',
  'THREAT_INTELLIGENCE': 'Defender for Office 365 P2',
  'IDENTITY_THREAT_PROTECTION': 'Entra ID P2',
  'AAD_PREMIUM': 'Entra ID P1',
  'AAD_PREMIUM_P2': 'Entra ID P2',
  'EMSPREMIUM': 'EMS E5',
  'EMS': 'EMS E3',
  'INTUNE_A': 'Intune Plan 1',
  'RIGHTSMANAGEMENT': 'Azure Information Protection P1',
  'WIN_ENT_E5': 'Windows 10/11 Enterprise E5',
  'WIN10_PRO_ENT_SUB': 'Windows 10/11 Enterprise E3',
  'PHONESYSTEM_VIRTUALUSER': 'Phone System Virtual User',
  'MCOCAP': 'Common Area Phone',
  'MCOEV': 'Phone System',
  'MCOPSTN1': 'Domestic Calling Plan',
  'MCOPSTN2': 'International Calling Plan',
  'MEETING_ROOM': 'Teams Rooms Standard',
  'MTR_PREM': 'Teams Rooms Pro',

  // Dynamics
  'DYN365_ENTERPRISE_PLAN1': 'Dynamics 365 Plan 1',
  'D365_SALES_PRO': 'Dynamics 365 Sales Professional',

  // Free / Viral (EXCLUDE from aggregates)
  'STREAM': 'Microsoft Stream (Classic)',
  'FLOW_FREE': 'Power Automate Free',
  'POWERAPPS_VIRAL': 'Power Apps (Viral)',
  'POWER_BI_STANDARD': 'Power BI Free',
  'POWER_BI_INDIVIDUAL_USER': 'Power BI Free (Individual)',
  'TEAMS_EXPLORATORY': 'Teams Exploratory',
  'TEAMS_COMMERCIAL_TRIAL': 'Teams Commercial Trial',
  'CCIBOTS_PRIVPREV_VIRAL': 'Copilot Studio Viral Trial',
  'RIGHTSMANAGEMENT_ADHOC': 'Azure RMS Ad Hoc',
  'WINDOWS_STORE': 'Windows Store for Business',
  'PROJECTESSENTIALS': 'Project Online Essentials',
  'DYN365_ENTERPRISE_P1_IW': 'Dynamics 365 P1 Trial (Viral)',
  'POWERAPPS_DEV': 'Power Apps Developer',
  'FLOW_DEV': 'Power Automate Developer',
  'FORMS_PRO': 'Dynamics 365 Customer Voice Trial',
  'Microsoft_Teams_Exploratory': 'Teams Exploratory',
};

/**
 * Patterns that identify viral/free SKUs.
 * A SKU matching any of these patterns (case-insensitive) is excluded from aggregates.
 */
const VIRAL_FREE_PATTERNS: string[] = [
  'VIRAL', 'FREE', 'TRIAL', 'TEAMS_EXPLORATORY',
  'TEAMS_COMMERCIAL_TRIAL', 'CCIBOTS_PRIVPREV',
  'STREAM', 'WINDOWS_STORE', 'RIGHTSMANAGEMENT_ADHOC',
  'POWERAPPS_DEV', 'FLOW_DEV', 'FORMS_PRO',
  'POWER_BI_STANDARD', 'POWER_BI_INDIVIDUAL',
  'DYN365_ENTERPRISE_P1_IW', 'PROJECTESSENTIALS',
  'Microsoft_Teams_Exploratory',
];

/**
 * Patterns that identify add-on SKUs (not core suites).
 */
const ADDON_PATTERNS: string[] = [
  'ATP', 'THREAT', 'IDENTITY', 'AAD_PREMIUM', 'EMS', 'INTUNE',
  'RIGHTS', 'WIN_ENT', 'WIN10', 'PHONE', 'MCO', 'MEETING_ROOM',
  'MTR_', 'COPILOT', 'VISIO', 'PROJECT', 'POWER_BI_PRO', 'PBI_PREMIUM',
  'POWERAPPS_PER', 'FLOW_PER', 'DYN365', 'D365',
];

/**
 * Classifies a SKU based on its SkuPartNumber.
 * @param skuPartNumber The raw SKU part number from Microsoft Graph
 * @returns Classification including tier, friendly name, and exclusion flag
 */
export function classifySku(skuPartNumber: string): ISkuClassification {
  const upperSku = skuPartNumber.toUpperCase();

  // Check viral/free first
  const isViralFree = VIRAL_FREE_PATTERNS.some(p =>
    upperSku.includes(p.toUpperCase())
  );

  if (isViralFree) {
    return {
      tier: upperSku.includes('VIRAL') || upperSku.includes('TRIAL') ? 'viral' : 'free',
      friendlyName: SKU_FRIENDLY_NAMES[skuPartNumber] || skuPartNumber,
      isExcludedFromAggregates: true,
    };
  }

  // Check add-ons (not core suites)
  const isAddon = ADDON_PATTERNS.some(p => upperSku.includes(p));

  return {
    tier: isAddon ? 'add-on' : 'core-paid',
    friendlyName: SKU_FRIENDLY_NAMES[skuPartNumber] || skuPartNumber,
    isExcludedFromAggregates: false,
  };
}

/**
 * Classifies a SKU with an additional heuristic based on Purchased count.
 * Microsoft often sets Purchased to 1,000,000 or 10,000 for viral/free SKUs.
 * @param skuPartNumber The raw SKU part number
 * @param purchased The purchased/enabled count from the SKU
 * @returns Classification with fallback for absurdly high purchased counts
 */
export function classifySkuWithPurchased(skuPartNumber: string, purchased: number): ISkuClassification {
  const result = classifySku(skuPartNumber);

  // If the pattern-based check didn't catch it, but purchased is absurdly high, it's viral/free
  if (!result.isExcludedFromAggregates && purchased >= 100000) {
    return { ...result, tier: 'viral', isExcludedFromAggregates: true };
  }

  return result;
}

/**
 * Gets the friendly name for a SKU part number.
 * Falls back to the raw part number if no mapping exists.
 * @param skuPartNumber The raw SKU part number
 * @returns Human-readable friendly name
 */
export function getSkuFriendlyName(skuPartNumber: string): string {
  return SKU_FRIENDLY_NAMES[skuPartNumber] || skuPartNumber;
}

/**
 * Gets the tier display label for use in UI badges.
 */
export function getTierLabel(tier: SkuTier): string {
  switch (tier) {
    case 'core-paid': return 'Core';
    case 'add-on': return 'Add-on';
    case 'free': return 'Free';
    case 'viral': return 'Trial';
  }
}

/**
 * Gets the tier colour for use in UI badges.
 */
export function getTierColour(tier: SkuTier): string {
  switch (tier) {
    case 'core-paid': return '#00289e'; // Lebara Navy
    case 'add-on': return '#00A4E4';    // Lebara Cyan
    case 'free': return '#6B7280';      // Grey
    case 'viral': return '#F59E0B';     // Amber
  }
}
