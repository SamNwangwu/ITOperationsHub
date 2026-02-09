# Licence Intelligence Fixes + Status Indicator Task

## Context

Licence Intelligence web part inside the IT Operations Hub SPFx solution. This task addresses three categories of issues: incorrect savings calculations, broken filter logic, and implementing functional status indicators on hub/spoke homepages.

Work through patches in order. Run `npm run build` only AFTER all patches are complete, then fix any errors and rebuild.

---

## PATCH 1: Fix Savings Calculation for Inactive 90+ (and Disabled)

### Problem

The Inactive 90+ issue card shows potential savings of ~£5.2k/yr for 42 users. However, the vast majority of those 42 users only hold free/viral licences (e.g. Teams Exploratory, Power BI Standard, etc.). Only ~6 users actually have paid licences (E5/E3). The savings should be approximately £3.6k (6 users x ~£50/mo x 12), not £5.2k.

The root cause is in `calculateUserSavings()` in `SharePointDataService.ts`. It resolves each licence name via `findPricingByLicenceName()`, and if a pricing record is found, it adds the cost. The issue is that:

1. The pricing lookup may be matching some free/viral licence names if they happen to exist in the LicencePricing SharePoint list
2. More importantly, the calculation does NOT check whether a licence is free/viral before costing it -- it costs everything that has a pricing match

The same issue affects the Disabled category savings.

### Files

- `src/webparts/licenseManagement/services/SharePointDataService.ts` — `calculateUserSavings()` method
- `src/webparts/licenseManagement/services/DowngradeEngine.ts` — `getUserCostBreakdown()` method (should be consistent)
- `src/webparts/licenseManagement/utils/SkuClassifier.ts` — for classification lookup

### Fix

1. In `calculateUserSavings()`, after resolving each licence name to a pricing record, also classify the licence using the SkuClassifier. If the licence's SKU is classified as `isExcludedFromAggregates: true` (viral/free/capacity), its cost should be **excluded** from the savings calculation, even if a pricing record exists.

2. The flow should be:
   ```
   For each licence name in user.Licences:
     a. Find the SKU record by matching licence name to skus[].Title or skus[].SkuPartNumber
     b. If found, run classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned)
     c. If classification.isExcludedFromAggregates === true, skip this licence (cost = 0)
     d. Otherwise, look up pricing and use MonthlyCostPerUser as before
   ```

3. Apply the same logic in `DowngradeEngine.ts` `getUserCostBreakdown()` to keep calculations consistent. When building the `licences` array, add a check: if the SKU is excluded from aggregates, set `monthlyCost: 0` and `pricingSource: 'excluded_free'`.

4. The `getIssueCategories()` method calls `calculateSavings()` which calls `calculateUserSavings()` per user, so fixing the per-user method fixes the category totals automatically.

### Verification

- The Inactive 90+ savings should drop significantly (from ~£5.2k to ~£3.6k or similar, reflecting only users with paid licences)
- The Disabled category savings should also be recalculated correctly
- Service Account savings should remain £0 (already handled)
- Dual-Licensed savings should be unaffected (those users by definition have E3+E5, both paid)

---

## PATCH 2: Change Issue Filter from OR to AND (Intersection Logic)

### Problem

On the Issues & Optimisation tab, when a user clicks two issue tiles (e.g. Disabled and Inactive 90+), the table shows users that match EITHER filter (union/OR). The expected behaviour is to show users that match ALL selected filters (intersection/AND).

However, there is a fundamental data model constraint: each user has a single `IssueType` field (one value: 'Disabled', 'Dual-Licensed', 'Inactive 90+', 'Service Account', or 'None'). A user cannot have two IssueTypes simultaneously. This means a strict AND across IssueType values would always return zero results.

### The Real Need

What Sam actually wants is **cross-attribute filtering**. For example:
- Show me users who are **Disabled** AND have **E5 licences**
- Show me users who are **Inactive 90+** AND are in **Finance department**
- Show me users who are **Disabled** AND also **Inactive 90+** (this would require detecting both conditions)

### Fix — Two-Part Approach

#### Part A: Allow compound issue detection

Currently, a user gets exactly one IssueType. But a user could legitimately be BOTH disabled AND inactive 90+. The PowerShell extraction script assigns one type, but the web part should detect overlapping conditions.

In `SharePointDataService.ts`, add a new method:

```typescript
/**
 * Get all applicable issue flags for a user (a user can match multiple conditions)
 */
public getUserIssueFlags(user: ILicenceUser): string[] {
  const flags: string[] = [];
  if (!user.AccountEnabled) flags.push('Disabled');
  if (user.HasE3 && user.HasE5) flags.push('Dual-Licensed');
  if (user.DaysSinceSignIn >= 90 && user.AccountEnabled) flags.push('Inactive 90+');
  if (user.IsServiceAccount) flags.push('Service Account');
  return flags;
}
```

Note: The original IssueType logic for Inactive 90+ only flags users who are AccountEnabled (i.e. not already flagged as Disabled). The compound detection above preserves that for Inactive 90+ but adds Disabled independently. A user who is disabled AND hasn't signed in for 90+ days would get both flags.

#### Part B: Change filter logic to AND (intersection)

In `getFilteredUsers()` in `LicenseManagement.tsx`, change from:

```typescript
// Current: OR logic
filtered = filtered.filter(u => issueFilters.indexOf(u.IssueType as IssueFilterType) >= 0);
```

To:

```typescript
// New: AND logic using compound flags
filtered = filtered.filter(u => {
  const userFlags = this.dataService.getUserIssueFlags(u);
  // User must match ALL selected filters
  return issueFilters.every(f => userFlags.indexOf(f) >= 0);
});
```

Apply the same change in the All Users tab (`renderUsersTab`) where `usersIssueFilters` is used.

#### Part C: Update issue card counts to reflect compound detection

The issue category cards should show counts based on `getUserIssueFlags()` not just `IssueType`. Update `getIssueCategories()`:

```typescript
const disabledUsers = users.filter(u => this.getUserIssueFlags(u).includes('Disabled'));
// etc.
```

**Important**: This means a single user can now count towards multiple categories. The total across cards may exceed the total unique issue users. This is correct and expected -- add a subtle note below the cards: "Users may appear in multiple categories".

#### Part D: Update the filter label

When multiple filters are active, the table header should show "Disabled + Inactive 90+ (X)" rather than just listing one. Update the `filterLabel` logic in `renderIssuesTab()`:

```typescript
const filterLabel = issueFilters.indexOf('all') >= 0
  ? `All Issues (${totalIssues})`
  : issueFilters.join(' + ');
```

### Verification

- Clicking Disabled then Inactive 90+ shows ONLY users who are both disabled AND inactive 90+ days
- Clicking just one filter works as before (shows all users with that flag)
- Issue card counts may increase slightly (users counted in multiple categories)
- A note appears below the cards explaining overlap
- `npm run build` passes

---

## PATCH 3: Implement Functional Status Indicator on Hub, Infrastructure, and Service Management Homepages

### Problem

The `_checkStatus()` method in `ItOpsHomepage.tsx` is a placeholder that hardcodes `'healthy'`. The status badge needs to pull real data.

### Architecture Decision

Use a SharePoint list-based approach rather than live API calls from the browser. This decouples data collection from display.

### Step 1: Define SharePoint List Schema

Create a new SharePoint list called `ITOpsHealthStatus` on the ITOpsHub site with these columns:

| Column | Type | Description |
|--------|------|-------------|
| Title | Single line text | Spoke name (Hub, Infrastructure, IAM, Platform Engineering, Service Management, Licence Intelligence) |
| Status | Choice | healthy, degraded, down |
| StatusDetail | Multiple lines text | Brief description of current state |
| LastChecked | Date/Time | When the status was last updated |
| CheckedBy | Single line text | 'Automated' or username |

### Step 2: Update `_checkStatus()` in ItOpsHomepage.tsx

Replace the placeholder with a SharePoint REST call:

```typescript
private async _checkStatus(): Promise<void> {
  try {
    const webUrl = this.props.context.pageContext.web.absoluteUrl;
    const hubUrl = this.props.hubSiteUrl || webUrl; // Hub site where the list lives

    // Determine which spoke this page belongs to based on siteType prop
    const spokeMap: Record<string, string> = {
      'Hub': 'Hub',
      'Infrastructure': 'Infrastructure',
      'IAM': 'IAM',
      'Platform': 'Platform Engineering',
      'ServiceMgmt': 'Service Management',
      'Security': 'Security',
      'NOC': 'NOC',
      'NetworkInfra': 'Infrastructure'
    };

    const spokeName = spokeMap[this.props.siteType] || 'Hub';

    // For Hub: aggregate all spokes (worst status wins)
    // For spokes: fetch own status only
    const filter = this.props.siteType === 'Hub'
      ? '' // Get all rows
      : `$filter=Title eq '${spokeName}'`;

    const apiUrl = `${hubUrl}/_api/web/lists/getbytitle('ITOpsHealthStatus')/items?${filter}&$orderby=Title`;

    const response = await this.props.context.spHttpClient.get(
      apiUrl,
      SPHttpClient.configurations.v1
    );

    if (!response.ok) {
      // List may not exist yet -- default to healthy
      this.setState({ systemStatus: 'healthy' });
      return;
    }

    const data = await response.json();
    const items = data.value || [];

    if (items.length === 0) {
      this.setState({ systemStatus: 'healthy' });
      return;
    }

    if (this.props.siteType === 'Hub') {
      // Aggregate: worst status wins
      const hasDown = items.some((i: any) => i.Status === 'down');
      const hasDegraded = items.some((i: any) => i.Status === 'degraded');
      const status = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';
      this.setState({ systemStatus: status });
    } else {
      // Single spoke
      const item = items[0];
      this.setState({ systemStatus: item.Status || 'healthy' });
    }
  } catch (error) {
    console.warn('Status check failed, defaulting to healthy:', error);
    this.setState({ systemStatus: 'healthy' });
  }
}
```

### Step 3: Add hubSiteUrl property

In `ItOpsHomepageWebPart.ts`, add a new web part property `hubSiteUrl` (string, optional) so spoke sites can point to the hub site where the ITOpsHealthStatus list lives. Default to the current site URL.

Add it to the property pane:

```typescript
PropertyPaneTextField('hubSiteUrl', {
  label: 'Hub Site URL',
  description: 'URL of the IT Ops Hub site (for status indicator). Leave blank if this IS the hub site.',
  placeholder: 'https://lebara.sharepoint.com/sites/ITOpsHub'
})
```

Update `IItOpsHomepageProps` interface to include `hubSiteUrl?: string`.

### Step 4: Only show on relevant pages

The status badge should only appear when `showStatusBadge` is enabled AND the siteType is one of: Hub, Infrastructure, ServiceMgmt. For other siteTypes, even if `showStatusBadge` is true, don't render it (the dashboard content speaks for itself on those pages).

Add a check in the render method:

```typescript
const statusEligibleTypes = ['Hub', 'Infrastructure', 'ServiceMgmt'];
const shouldShowStatus = showStatusBadge && statusEligibleTypes.includes(this.props.siteType);
```

Then use `shouldShowStatus` instead of just `showStatusBadge` in the JSX.

### Verification

- Hub homepage aggregates all spoke statuses
- Infrastructure and Service Management homepages show their own status
- Other spokes (IAM, Platform, Licence Intelligence) do not show the badge even if configured
- Graceful fallback to 'healthy' if the list doesn't exist yet
- `npm run build` passes

---

## PATCH 4: Comprehensive Maths Audit -- Fix All Remaining Calculation Issues

### Summary of Full Audit

A thorough review of every calculation path across 8 services and components identified the following issues beyond what Patch 1 already covers. Each sub-patch below is an independent fix.

---

### 4A: Monthly Spend Calculation Uses SKU-Level Assigned Count, Not User-Level

**Location:** `SharePointDataService.calculateKpiSummary()` -- the `monthlySpend` calculation.

**Current logic:**
```typescript
paidSkus.forEach(sku => {
  const priceInfo = this.findPricing(pricing, sku.Title, sku.SkuPartNumber);
  if (priceInfo) {
    monthlySpend += sku.Assigned * priceInfo.MonthlyCostPerUser;
  }
});
```

**Issue:** This multiplies the SKU's `Assigned` count by per-user cost. This is correct in principle BUT has a subtle problem: if a pricing record matches a free/viral SKU that wasn't excluded (because it passed the `classifySkuWithPurchased` filter), it inflates the spend. After Patch 1 fixes the savings side, the same free-SKU exclusion must also be applied here.

**Fix:** The `paidSkus` variable already filters by `!isExcludedFromAggregates`, so this is correct IF Patch 1 properly classifies all viral/free SKUs. No code change needed here, but verify after Patch 1 that no free SKUs leak through. If `monthlySpend` still seems high, add a secondary guard:

```typescript
paidSkus.forEach(sku => {
  const priceInfo = this.findPricing(pricing, sku.Title, sku.SkuPartNumber);
  if (priceInfo && priceInfo.MonthlyCostPerUser > 0) {
    monthlySpend += sku.Assigned * priceInfo.MonthlyCostPerUser;
  }
});
```

This ensures a pricing record with £0 cost (which shouldn't exist but might) doesn't cause issues.

---

### 4B: Dual-Licensed Savings -- Silent Failure When Only One Licence Resolves

**Location:** `SharePointDataService.calculateUserSavings()` and `DowngradeEngine.getUserCostBreakdown()`

**Current logic for Dual-Licensed:**
```typescript
if (user.IssueType === 'Dual-Licensed') {
  if (licenceCosts.length <= 1) return 0;  // <-- BUG
  const sorted = [...licenceCosts].sort((a, b) => b - a);
  return sorted.slice(1).reduce((sum, cost) => sum + cost, 0);
}
```

**Issue:** If a dual-licensed user has `Licences: "Microsoft 365 E3, Microsoft 365 E5"` but one of those names doesn't match any pricing record, it resolves to cost £0. The `licenceCosts` array would be `[49.20, 0]` or `[0, 30.20]`. The logic sorts and removes the highest, meaning:
- If E5 resolves (£49.20) but E3 doesn't (£0): savings = £0. **Correct** -- we'd keep E5, remove the unresolvable one (no savings).
- If E3 resolves (£30.20) but E5 doesn't (£0): savings = £0. **WRONG** -- we're keeping the £0 one and removing the £30.20 one, but showing £0 savings.

The real problem is: if the more expensive licence fails to resolve, we undercount savings.

**Fix:** Before calculating dual-licensed savings, filter out £0 entries (unresolvable licences). If after filtering only one remains, the savings for that user is £0 (we can't determine the redundant cost). But log a warning for debugging:

```typescript
if (user.IssueType === 'Dual-Licensed') {
  const paidLicenceCosts = licenceCosts.filter(c => c > 0);
  if (paidLicenceCosts.length <= 1) return 0; // Can't determine redundancy
  const sorted = [...paidLicenceCosts].sort((a, b) => b - a);
  return sorted.slice(1).reduce((sum, cost) => sum + cost, 0);
}
```

Apply the same fix in `DowngradeEngine.getUserCostBreakdown()`:

```typescript
case 'Dual-Licensed':
  if (licences.length > 1) {
    const paidLicences = licences.filter(l => l.monthlyCost > 0);
    if (paidLicences.length > 1) {
      const sorted = [...paidLicences].sort((a, b) => b.monthlyCost - a.monthlyCost);
      potentialMonthlySavings = sorted.slice(1).reduce((sum, l) => sum + l.monthlyCost, 0);
      savingsReason = `Remove redundant licence(s), keep ${sorted[0].name}`;
    }
  }
  break;
```

---

### 4C: DowngradeEngine Standard Pricing Fallback -- Partial String Matching Is Risky

**Location:** `DowngradeEngine.getLicenceCost()` -- Strategy 5 (standard pricing fallback)

**Current logic:**
```typescript
if (trimmedName.toLowerCase().indexOf(name.toLowerCase()) >= 0 ||
    name.toLowerCase().indexOf(trimmedName.toLowerCase()) >= 0) {
  return { cost, source: 'standard' };
}
```

**Issue:** This does bidirectional substring matching. If a licence is named "Microsoft 365 E3 (No ProPlus)" it would match "Microsoft 365 E3" -- that's fine. But if a licence is named "E3" it would also match "Microsoft 365 E3" -- potentially incorrect. More dangerously, a licence called "Microsoft 365" would match EVERY entry in `STANDARD_PRICING` and return the first match (E5 at £49.20), massively overstating the cost.

**Fix:** Make the fallback more conservative. Only match if the licence name contains the full standard name, not the other way around:

```typescript
// Strategy 5: Standard pricing fallback - only if licence name contains full standard name
const standardNames = Object.keys(STANDARD_PRICING);
for (let i = 0; i < standardNames.length; i++) {
  const name = standardNames[i];
  const cost = STANDARD_PRICING[name];
  // Only match if the licence name contains the FULL standard name (not vice versa)
  if (trimmedName.toLowerCase().indexOf(name.toLowerCase()) >= 0) {
    return { cost, source: 'standard' };
  }
}
```

Remove the reverse check `name.toLowerCase().indexOf(trimmedName.toLowerCase()) >= 0`.

---

### 4D: UsageReportService Has Its Own STANDARD_PRICING -- Potential Drift

**Location:** `UsageReportService.ts` -- duplicate `STANDARD_PRICING` constant

**Issue:** Both `DowngradeEngine.ts` and `UsageReportService.ts` define their own `STANDARD_PRICING` dictionaries. If prices are updated in one but not the other, savings calculations will be inconsistent between the Usage Analysis tab and the Issues/Executive Summary tabs.

**Fix:** Extract `STANDARD_PRICING` into a shared constant file:

1. Create `src/webparts/licenseManagement/constants/Pricing.ts`:
```typescript
/** Standard UK pricing fallback (monthly per user, GBP) */
export const STANDARD_PRICING: Record<string, number> = {
  'Microsoft 365 E5': 49.20,
  'Microsoft 365 E3': 30.20,
  'Office 365 E5': 32.00,
  'Office 365 E3': 19.00,
  'Microsoft 365 F3': 7.50,
  'Office 365 F3': 3.40,
  'Microsoft 365 Business Basic': 4.50,
  'Microsoft 365 Business Standard': 9.40,
  'Microsoft 365 Business Premium': 16.60,
  'Microsoft 365 Apps for Enterprise': 11.20,
};
```

2. Update `DowngradeEngine.ts` and `UsageReportService.ts` to import from this shared file instead of defining their own copies.

---

### 4E: SavingsHero Percentage Calculation -- Division by Zero Guard Exists but savingsPct Can Be Misleading

**Location:** `SavingsHero.tsx`

**Current logic:**
```typescript
const savingsPct = monthlySpend > 0 ? Math.round((monthlyAmount / monthlySpend) * 100) : 0;
```

**Issue:** This is technically correct, but if `monthlyAmount` (potential savings) is inflated due to the free-licence bug (Patch 1), then the percentage shown in the hero banner is also inflated. After Patch 1, this will self-correct. No code change needed here, but verify after Patch 1 that the percentage looks reasonable (typically 5-15% for a well-managed estate, up to 30% for poorly managed).

**Status:** No fix required -- self-corrects after Patch 1.

---

### 4F: ComparisonService -- Snapshot Aggregation Sums All SKUs Including Viral

**Location:** `ComparisonService.calculatePeriodTotals()`

**Current logic:**
```typescript
totalAssigned: snapshots.reduce((sum, s) => sum + s.Assigned, 0),
totalPurchased: snapshots.reduce((sum, s) => sum + s.Purchased, 0),
```

**Issue:** This sums Purchased/Assigned across ALL snapshots for a period, including viral/free SKUs. The month-over-month utilisation comparison will show the same inflated numbers as the main KPI if viral SKUs are in the snapshot data. Unlike `calculateKpiSummary()` which filters to `paidSkus`, the comparison service has no such filter.

**Fix:** The ComparisonService needs access to SKU classification. Update `generateMonthComparison` to accept the SKU list and filter snapshots:

```typescript
public generateMonthComparison(snapshots: ILicenceSnapshot[], skus?: ILicenceSku[]): IMonthComparisonData | null {
```

In `calculatePeriodTotals`, filter out snapshots for viral/free SKUs:

```typescript
private calculatePeriodTotals(snapshots: ILicenceSnapshot[], skus?: ILicenceSku[]) {
  let filteredSnapshots = snapshots;
  
  if (skus && skus.length > 0) {
    // Build set of paid SKU names
    const paidSkuNames = new Set(
      skus
        .filter(s => !classifySkuWithPurchased(s.SkuPartNumber, s.Purchased, s.Assigned).isExcludedFromAggregates)
        .map(s => s.Title)
    );
    filteredSnapshots = snapshots.filter(s => paidSkuNames.has(s.SkuName));
  }

  const firstSnap = filteredSnapshots[0];
  return {
    totalUsers: firstSnap ? firstSnap.TotalUsers || 0 : 0,
    totalAssigned: filteredSnapshots.reduce((sum, s) => sum + s.Assigned, 0),
    totalPurchased: filteredSnapshots.reduce((sum, s) => sum + s.Purchased, 0),
    disabledCount: firstSnap ? firstSnap.DisabledCount || 0 : 0,
    inactiveCount: firstSnap ? firstSnap.InactiveCount || 0 : 0,
    dualCount: firstSnap ? firstSnap.DualCount || 0 : 0,
    serviceCount: firstSnap ? firstSnap.ServiceCount || 0 : 0
  };
}
```

Then in `LicenseManagement.tsx`, update the call:

```typescript
const monthComparison = this.comparisonService.generateMonthComparison(data.snapshots, data.skus);
```

---

### 4G: InsightEngine -- Over-Allocated/Under-Utilised Checks Don't Filter Free SKUs

**Location:** `InsightEngine.analyzeUtilisation()`

**Current logic:**
```typescript
const overAllocated = skus.filter(s => s.Assigned > s.Purchased);
const underUtilised = skus.filter(s => s.UtilisationPct < 70 && s.Purchased >= 10);
```

**Issue:** This uses the raw `skus` array without filtering out viral/free SKUs. A viral SKU with 10,000 purchased and 50 assigned would show as "under-utilised" at 0.5%. An auto-provisioned SKU with 0 purchased and 610 assigned would show as "over-allocated".

**Fix:** Filter to paid SKUs before analysis:

```typescript
private analyzeUtilisation(skus: ILicenceSku[], kpi: IKpiSummary): IInsight[] {
  const insights: IInsight[] = [];

  // Only analyse paid SKUs
  const paidSkus = skus.filter(s => 
    !classifySkuWithPurchased(s.SkuPartNumber, s.Purchased, s.Assigned).isExcludedFromAggregates
  );

  const overAllocated = paidSkus.filter(s => s.Purchased > 0 && s.Assigned > s.Purchased);
  const underUtilised = paidSkus.filter(s => s.UtilisationPct < 70 && s.Purchased >= 10);
  // ... rest unchanged
}
```

Add the import for `classifySkuWithPurchased` at the top of `InsightEngine.ts`.

---

### 4H: DowngradeEngine E5 to E3 Recommendation -- Uses DaysSinceSignIn as Proxy for Feature Usage

**Location:** `DowngradeEngine.generateDowngradeRecommendations()`

**Current logic:**
```typescript
if (hasE5 && user.DaysSinceSignIn > 30 && user.DaysSinceSignIn < 90) {
  // Recommend E5 → E3
}
```

**Issue:** This is NOT a maths bug but a logic concern worth flagging. DaysSinceSignIn > 30 doesn't mean a user isn't using E5-exclusive features -- they could have been very active 31 days ago using Defender, eDiscovery, and Power BI Pro. The confidence level is rightly set to 'medium'/'low', but the recommendation description says "Low activity suggests E5 features may not be needed" which overstates the confidence.

**Fix (description only, not logic):** Update the reason text to be more accurate:

```typescript
reason: `Reduced sign-in activity (${user.DaysSinceSignIn} days since last sign-in). Review E5 feature usage before downgrading.`,
```

Also add a note: the accuracy of this recommendation will improve significantly once Usage Analysis data (Graph Reports API) is integrated -- at that point, actual per-service usage can drive the recommendation instead of sign-in recency.

No calculation change needed.

---

### Verification for All of Patch 4

After implementing all sub-patches:

1. Monthly spend should reflect only paid SKU costs
2. Dual-licensed savings should not silently return £0 when one licence fails to resolve pricing
3. Standard pricing fallback should not match partial strings incorrectly
4. STANDARD_PRICING should be defined in exactly one place
5. Month-over-month comparison should use paid SKUs only (consistent with main KPIs)
6. Insights about over-allocated/under-utilised should not flag viral/free SKUs
7. `npm run build` passes

---

## Build & Test

After ALL patches are complete:

```bash
npm run build
```

Fix any errors, then rebuild. Do not run `npm run build` between patches.