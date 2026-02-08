# Licence Intelligence V3 -- Improvement Task

## Context

This is the Licence Intelligence web part inside the IT Operations Hub SPFx solution. It has 6 tabs: Executive Summary, Cost Analysis, Utilisation & Adoption, Usage Analysis, Issues & Optimisation, All Users. Plus a User Detail drill-through page.

The dashboard is deployed and functional but has visual bugs, UX gaps, and data quality issues that need fixing before the C-suite presentation.

Work through the patches in order. Each patch should result in a clean `npm run build`. Do not skip patches or combine them -- they are sequenced to avoid conflicts.

---

## PATCH 1: Fix SKU Classification -- Inflated Aggregate Metrics

### Problem

The "Utilisation" KPI on Executive Summary shows 9% with "5,098 of 57,267". The 57,267 total purchased means high-allocation viral/free SKUs are leaking through the `isExcludedFromAggregates` filter. SKUs like "Intune Plan 1" (10,000 purchased), "Microsoft Business Center" (10,000), "CDS File Capacity" (1,051), "M365 E5 Suite Components" (610) are likely not being classified as excludable.

### File

`src/webparts/licenseManagement/utils/SkuClassifier.ts`

### Fix

1. Review the `classifySkuWithPurchased()` function and the SKU classification logic.
2. The rule should be: a SKU is excluded from aggregates if it is viral/free (purchased >= 10,000 with very low assignment) OR if it is a suite component/add-on that is automatically provisioned (not independently purchased).
3. Add these SkuPartNumbers to the exclusion list if not already present:
   - `INTUNE_A` (Intune Plan 1 -- 10,000 seat viral allocation)
   - `MICROSOFT_BUSINESS_CENTER` (10,000 seat)
   - `CDS_FILE_CAPACITY` (capacity SKU, not a user licence)
   - `M365_E5_SUITE_COMPONENTS` (suite component, auto-provisioned with E5)
   - `ADALLOM_STANDALONE` (Cloud App Security, auto-provisioned)
   - `DYN365_ENTERPRISE_P1` and similar Dynamics sandbox SKUs with very low assignment vs high purchased
   - Any SKU where `Purchased >= 500` and `Assigned / Purchased < 0.05` (catch-all for viral allocations)
4. The `getCorePaidSkus()` method should return ONLY genuinely core user licences. Filter to tier `core-paid` AND ensure only SKUs that are actual user subscriptions appear as gauges: M365 E5, M365 E3, M365 F1/F3, Office 365 E3/E5, EMS E3/E5 and similar. Not capacity SKUs, not sandbox SKUs, not suite components.

### Verification

- `npm run build` passes
- The aggregate "Purchased" count should be in the low thousands (roughly matching actual user count), not 57k
- Utilisation % should be realistic (likely 70-99% for core SKUs)
- Core Licence Utilisation section should show 3-5 gauges maximum, not 10+

---

## PATCH 2: Fix Utilisation Gauge Overflow

### Problem

Gauges show "+5600%", "+28200%", "+42800%" when assigned > purchased. The percentage overflows and the display shows "00%" with a red overflow number overlapping the gauge.

### Files

- `src/webparts/licenseManagement/components/charts/UtilisationGauge.tsx`
- Any parent component rendering gauges (Utilisation tab in `LicenseManagement.tsx`)

### Fix

1. Cap the gauge visual at 100%. If utilisation > 100%, the arc should be full (100%) with a red fill colour.
2. Display the actual percentage inside the gauge (e.g. "5600%") but format it as a compact badge: "Over-allocated" with the overflow count below (e.g. "+56 over").
3. Better approach: when `Assigned > Purchased`, show:
   - Gauge filled to 100% in red
   - Centre text: the assigned count (e.g. "57")
   - Below gauge: "of 1 purchased" in muted text
   - A small red badge: "56 over-allocated"
4. Ensure the text never overflows or overlaps the gauge boundary.

### Verification

- `npm run build` passes
- No text overflow on any gauge
- Over-allocated SKUs show clearly as red with readable numbers

---

## PATCH 3: Reduce Pink/Magenta Dominance

### Problem

Too much magenta (#E4007D) used throughout. It should be an accent colour, not the primary.

### Files

- `src/webparts/licenseManagement/components/LicenseManagement.module.scss`
- `src/webparts/licenseManagement/components/pages/ExecutiveSummaryPage.tsx` (inline styles)
- `src/webparts/licenseManagement/components/ui/KpiCard.tsx` (if applicable)
- Any component using magenta for non-accent purposes

### Fix

1. **KPI card top borders**: Currently all magenta. Change to status-based colours:
   - Licensed Users: `#00A4E4` (Lebara cyan/blue)
   - Monthly Spend: `#00289e` (Lebara primary blue)
   - Utilisation: Use status colour based on value (green if >= 80%, orange if >= 50%, red if < 50%)
   - Issues: Use status colour based on severity (red if critical alerts > 0, orange otherwise, green if 0)
2. **Savings hero banner**: Keep the magenta gradient border -- this is appropriate as it's the key CTA.
3. **Header gradient**: Keep as-is (magenta to blue). This is branded and appropriate.
4. **Active tab underline**: Change from magenta to Lebara cyan `#00A4E4`.
5. **"View Opportunities" button**: Keep magenta -- it's a primary CTA.
6. **Alert badge colours**: These should be severity-based (red for critical, orange for warning), NOT magenta.
7. **Action Center items**: Use blue/cyan accents instead of magenta for non-critical items.
8. **Insight cards**: The left border colour should match the insight type (critical = red, warning = orange, info = blue, success = green), not magenta.

### General Rule

Magenta should ONLY appear on: header gradient, savings hero, primary CTA buttons, and the Lebara logo icon. Everything else uses the status palette (green/orange/red) or Lebara blue/cyan.

### Verification

- `npm run build` passes
- Visual check: magenta is accent only, not dominant
- Status colours are contextually correct

---

## PATCH 4: Fix Spend by Licence Type Chart Text Overlap

### Problem

The donut chart legend text overlaps with the centre "Monthly Spend" label (visible in screenshot). The legend has too many items and runs into the chart area.

### Files

- `src/webparts/licenseManagement/components/charts/SpendByTypeChart.tsx`

### Fix

1. Move the centre label (Monthly Spend amount) to above or below the chart, not overlapping the legend.
2. Limit the legend to the top 5-6 SKUs by spend. Group remaining into "Other".
3. If using Recharts PieChart, set `outerRadius` and chart dimensions so the donut doesn't overlap the legend area.
4. Consider switching from a bottom legend to a right-side legend list with percentage bars (more readable for 10+ items).
5. Ensure the legend text is truncated with ellipsis if names are too long (e.g. "PBI PREMIUM PER USER" could be "PBI Premium...").

### Verification

- `npm run build` passes
- No text overlap anywhere on the chart
- Legend is readable and doesn't crowd the visual

---

## PATCH 5: Usage Analysis Tab Improvements

### Problem

Multiple UX issues on the Usage Analysis tab.

### Files

- `src/webparts/licenseManagement/components/pages/UsageAnalysisPage.tsx`

### Fix

#### 5a: Scrollable Table Instead of Long Page

The user list currently renders as an unbounded list making the page very long. Wrap the user results in a scrollable container:

```tsx
<div style={{
  maxHeight: '600px',
  overflowY: 'auto',
  borderRadius: '8px',
  border: '1px solid #1F2937'
}}>
  {/* table content */}
</div>
```

Add a custom modern scrollbar style in the SCSS:

```scss
.scrollableTable {
  max-height: 600px;
  overflow-y: auto;
  border-radius: 8px;
  border: 1px solid $border-default;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: $bg-base;
    border-radius: 3px;
  }
  &::-webkit-scrollbar-thumb {
    background: $border-subtle;
    border-radius: 3px;
    &:hover {
      background: $text-muted;
    }
  }
}
```

#### 5b: Advanced Filtering

Replace the simple filter chips with a proper filter bar:
- Multi-select dropdown for filter categories (All, E5 Users, Downgrade Candidates) -- allow selecting multiple simultaneously
- Sort dropdown: Name A-Z, Name Z-A, Utilisation Low-High, Utilisation High-Low, Savings High-Low, Savings Low-High
- Search box (already exists, keep it)

#### 5c: Show Feature Usage on Downgrade Candidates

When a user is flagged as a downgrade candidate, the row or an expandable detail should show:
- Which E5-exclusive features they ARE using (with green checkmark)
- Which E5-exclusive features they are NOT using (with grey X)
- The E5_EXCLUSIVE_FEATURES list from `ILicenceData.ts` should drive this

This could be an expandable row or a tooltip/popover on hover. An expandable row is preferred for clarity.

### Verification

- `npm run build` passes
- Table scrolls within a fixed container
- Scrollbar is styled (thin, dark theme)
- Multiple filters can be selected at once
- Sorting works in both directions
- Downgrade candidates show feature usage breakdown

---

## PATCH 6: Issues & Optimisation Tab Improvements

### Problem

Multiple UX issues.

### Files

- `src/webparts/licenseManagement/components/LicenseManagement.tsx` (renderIssuesTab method)
- `src/webparts/licenseManagement/components/ui/DataTable.tsx`

### Fix

#### 6a: Multi-Select Filters

Replace the single-select dropdown with multi-select checkboxes or toggle buttons:
- Allow selecting multiple issue types simultaneously (e.g. "Disabled" AND "Dual-Licensed")
- The issue category cards at the top should also support multi-select (clicking one adds it to the filter, clicking again removes it)
- Update `getFilteredUsers()` to accept an array of issue types

#### 6b: Advanced Table Sorting

The DataTable component should support:
- Click column header to sort ascending, click again for descending, click again to clear sort
- Visual indicator (arrow icon) showing current sort direction
- Secondary sort support would be nice but not essential

#### 6c: Move Export Button to Table

Remove the Export button from the top-right header area. Place it in the table header bar, next to the filter controls. This makes it clear the export is of the currently filtered/visible data.

#### 6d: Navigate from Summary with Filter Applied

When a user clicks an action in the Executive Summary Action Center or an issue category, the navigation to the Issues tab should pre-apply the relevant filter. For example, clicking "Disabled accounts" on the summary should navigate to Issues & Optimisation with the "Disabled" filter already active.

Update the `onNavigate` callback to accept an optional filter parameter:

```typescript
onNavigate?: (tab: string, filter?: string) => void;
```

In `LicenseManagement.tsx`, the `onTabChange` (or a new method) should accept the filter and set it in state:

```typescript
private navigateWithFilter = (tab: string, filter?: string) => {
  this.setState({
    activeTab: tab as TabType,
    issueFilter: filter ? (filter as IssueFilterType) : 'all',
    selectedUser: null
  });
};
```

### Verification

- `npm run build` passes
- Can select multiple issue types
- Column headers show sort direction
- Export button is in the table area
- Clicking an issue card on Summary navigates to Issues tab with that filter applied

---

## PATCH 7: All Users Tab Improvements

### Problem

Table filtering and sorting are basic.

### Files

- `src/webparts/licenseManagement/components/LicenseManagement.tsx` (renderUsersTab method)

### Fix

1. Apply the same DataTable sorting improvements from Patch 6b.
2. Add multi-select for department filter (allow selecting multiple departments).
3. Add a licence type filter dropdown (filter by users who have a specific SKU).
4. Add an issue type filter (same as Issues tab, but here it's optional since this shows ALL users).
5. Export button should be in the table header, not the page header. Same as Patch 6c.
6. Apply the scrollable table container with modern scrollbar (same as Patch 5a) to keep the page height manageable.

### Verification

- `npm run build` passes
- Multiple departments can be selected
- Licence type filter works
- Table scrolls within a container
- Export is in the table header

---

## PATCH 8: Alerts "+X more" Expansion

### Problem

On Executive Summary, when there are more than 4 alerts, it shows "+3 more alerts" but clicking it does nothing.

### Files

- `src/webparts/licenseManagement/components/ui/AlertPanel.tsx`

### Fix

1. Make the "+X more" text clickable.
2. On click, expand the panel to show all alerts (remove the `maxVisible` cap temporarily).
3. Show a "Show less" link to collapse back to the default view.
4. Add a subtle hover state on the "+X more" text to indicate it's interactive.

### Verification

- `npm run build` passes
- "+X more" is clickable and expands to show all alerts
- "Show less" collapses back

---

## PATCH 9: Migrate Inline Styles to SCSS

### Problem

ExecutiveSummaryPage.tsx and the Utilisation section in LicenseManagement.tsx have extensive inline `style={{...}}` objects. This prevents hover states, transitions, and responsive breakpoints.

### Files

- `src/webparts/licenseManagement/components/pages/ExecutiveSummaryPage.tsx`
- `src/webparts/licenseManagement/components/LicenseManagement.tsx` (utilisation section)
- `src/webparts/licenseManagement/components/LicenseManagement.module.scss`

### Fix

1. Extract all inline styles from ExecutiveSummaryPage.tsx into named SCSS classes in the module stylesheet.
2. Extract the Utilisation tab rendering into its own page component (`UtilisationPage.tsx`) in the `pages/` directory, consistent with the other tabs.
3. Replace inline styles in the new UtilisationPage with SCSS classes.
4. Add hover/transition states where appropriate (cards, buttons, interactive elements).
5. Preserve all existing visual appearance -- this is a refactor, not a redesign.

### Naming Convention

Use descriptive class names prefixed by section:
- `.summaryHeroBanner`, `.summaryKpiGrid`, `.summaryAlertsColumn`, `.summaryChartsColumn`
- `.utilisationPage`, `.utilisationAttentionSection`, `.utilisationGaugeGrid`
- etc.

### Verification

- `npm run build` passes
- Visual appearance is identical before and after
- No inline `style={{}}` objects remain in ExecutiveSummaryPage or the utilisation rendering
- Hover states work on interactive elements

---

## PATCH 10: Extract Data & Fix Staleness

### Problem

The data extract is 5 days old. The PowerShell extraction script should be running daily.

### This is NOT a code patch

This is a reminder for the operator (Sam) to:
1. Verify `Get-LicenseIntelligence.ps1` is scheduled as a daily Azure Automation runbook or Windows Task Scheduler job.
2. Set it to run at 06:00 daily.
3. Verify the SharePoint list write permissions are still valid.

No code changes needed for this patch. Just a checklist item.

---

## General Rules for All Patches

1. TypeScript strict mode must pass -- no `any` types, no implicit nulls.
2. All new SCSS classes go in `LicenseManagement.module.scss` and are referenced via the `styles` import.
3. Do not add new npm dependencies without explicit approval.
4. Do not modify the SharePoint list schemas or the PowerShell extraction scripts.
5. Test `npm run build` after each patch before moving to the next.
6. Preserve the dark theme aesthetic and Lebara brand colours throughout.
7. Use `{'\u00A3'}` for pound symbols, never `$`.