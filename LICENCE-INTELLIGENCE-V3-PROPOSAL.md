# Licence Intelligence V3 - Comprehensive Overhaul Proposal

## Executive Summary

Transform the current Licence Intelligence dashboard from a **reporting tool** into an **actionable intelligence platform** that rivals commercial solutions like CoreView, Zylo, and ENow - but built natively in SharePoint.

**Goal:** Make this the best M365 licence management dashboard that doesn't require a £50k/year SaaS subscription.

---

## Current State Assessment

### What We Have (V2)
- 5-tab dashboard (Executive Summary, Cost Analysis, Utilisation, Issues, Users)
- KPI cards and basic charts
- Issue detection (Disabled, Dual-Licensed, Inactive 90+, Service Accounts)
- User drill-down with storage usage
- SKU classification system (100+ SKUs mapped)
- Savings calculations (issue-type-aware)

### What's Missing vs Commercial Tools
| Feature | CoreView | Zylo | ENow | **Us (V2)** |
|---------|----------|------|------|-------------|
| Downgrade recommendations | ✓ | ✓ | ✓ | ✗ |
| Feature utilization analysis | ✓ | ✓ | - | ✗ |
| Automated workflows | ✓ | ✓ | - | ✗ |
| Real-time alerts | ✓ | ✓ | ✓ | ✗ |
| ROI calculator | ✓ | ✓ | - | ✗ |
| Month-over-month comparison | ✓ | ✓ | ✓ | Partial |
| Bulk user actions | ✓ | ✓ | - | ✗ |
| Power BI integration | ✓ | - | ✓ | ✗ |
| Renewal tracking | ✓ | ✓ | - | ✗ |
| Mobile responsive | ✓ | ✓ | ✓ | ✗ |

---

## V3 Feature Roadmap

### Phase 1: Core Intelligence Enhancements

#### 1.1 Downgrade Recommendation Engine
**The #1 requested feature in enterprise licence management**

```
┌─────────────────────────────────────────────────────────────┐
│  DOWNGRADE OPPORTUNITIES                      £127,440/year │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ E5 → E3 Candidates                    156 users     │   │
│  │ Not using: Defender, eDiscovery, Power BI Pro       │   │
│  │ Potential savings: £2,959/mo (£35,508/year)         │   │
│  │ [View Users] [Export] [Create Task]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ E3 → F3 Candidates                    312 users     │   │
│  │ Frontline workers using <3 apps                     │   │
│  │ Potential savings: £6,552/mo (£78,624/year)         │   │
│  │ [View Users] [Export] [Create Task]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ E3 → Business Basic Candidates         44 users     │   │
│  │ Using only Exchange + Teams                         │   │
│  │ Potential savings: £1,109/mo (£13,308/year)         │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Data Required:**
- Per-user app/service activity (Teams, SharePoint, Exchange, OneDrive, Defender, etc.)
- Feature flags (Conditional Access, eDiscovery, DLP usage)

**Implementation:**
- New SharePoint list: `LicenceUsageByService`
- PowerShell extracts from Graph API usage reports
- Classification rules: E5 features vs E3 features vs F3 features

#### 1.2 Feature Utilization Heatmap
**Show which premium features are actually being used**

```
┌─────────────────────────────────────────────────────────────┐
│  E5 FEATURE UTILIZATION                                     │
├─────────────────────────────────────────────────────────────┤
│                                              Usage %        │
│  Teams Meetings              ████████████████████  92%      │
│  SharePoint                  ███████████████████   88%      │
│  Exchange Online             ███████████████████   85%      │
│  OneDrive                    █████████████████     78%      │
│  ─────────────────────────────────────────────────────      │
│  Power BI Pro                ██████                28%  ⚠️  │
│  Defender for O365           █████                 24%  ⚠️  │
│  eDiscovery Premium          ██                     8%  ⚠️  │
│  Audio Conferencing          █                      4%  ⚠️  │
│  Information Barriers        ░                      1%  ⚠️  │
│                                                             │
│  ⚠️ Low utilization = downgrade candidates                  │
└─────────────────────────────────────────────────────────────┘
```

#### 1.3 Smart Issue Detection (Beyond Current 4 Types)

**New Issue Categories:**

| Issue Type | Detection Logic | Savings |
|------------|-----------------|---------|
| **Over-Licensed** | E5 user using only E3 features | E5-E3 delta |
| **Duplicate Subscriptions** | Same user in multiple tenants | Full cost |
| **Shared Mailbox Licensed** | Shared mailbox with paid licence | Full cost |
| **Guest with Licence** | External user assigned internal licence | Full cost |
| **Expired Contractors** | Contract end date passed | Full cost |
| **Department Mismatch** | User moved depts, wrong licence tier | Tier delta |

---

### Phase 2: Actionable Workflows

#### 2.1 Action Center
**One-click remediation with approval workflows**

```
┌─────────────────────────────────────────────────────────────┐
│  ACTION CENTER                              23 pending      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 URGENT: 47 disabled accounts with licences       │   │
│  │    Total cost: £2,847/month                         │   │
│  │    [Remove All Licences] [Review List] [Snooze 7d]  │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 RECOMMENDED: Downgrade 156 E5→E3 users           │   │
│  │    Estimated savings: £2,959/month                  │   │
│  │    [Start Workflow] [View Analysis] [Dismiss]       │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 REVIEW: 89 users inactive 60-90 days             │   │
│  │    Approaching threshold for reclamation            │   │
│  │    [Send Reminder Emails] [View List] [Ignore]      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### 2.2 Power Automate Integration
**Trigger automated workflows from the dashboard**

- **Inactive User Workflow:** Send reminder email at 60 days → Manager notification at 75 days → Ticket creation at 90 days
- **New Starter Workflow:** Auto-assign licence based on department + job title rules
- **Leaver Workflow:** Auto-reclaim licence on AD disable
- **Approval Workflow:** Downgrade recommendations go to manager for approval

#### 2.3 Bulk Actions Panel

```
┌─────────────────────────────────────────────────────────────┐
│  BULK ACTIONS                           312 users selected  │
├─────────────────────────────────────────────────────────────┤
│  [Remove Licence] [Change Licence] [Export] [Email Users]   │
│  [Create Ticket] [Add to Review List] [Clear Selection]     │
│                                                             │
│  Preview:                                                   │
│  • 156 users: E3 → F3 (saves £78,624/year)                 │
│  • 89 users: Remove E3 (saves £32,218/year)                │
│  • 67 users: Keep current (no action)                       │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 3: Advanced Analytics

#### 3.1 Month-over-Month Comparison Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  JANUARY → FEBRUARY COMPARISON                              │
├─────────────────────────────────────────────────────────────┤
│                          Jan        Feb       Change        │
│  Total Licensed Users    2,847      2,912     +65 (+2.3%)  │
│  Active Users            2,341      2,389     +48 (+2.1%)  │
│  Monthly Spend           £87,420    £89,340   +£1,920      │
│  Issue Users             847        792       -55 (-6.5%)  │
│  ─────────────────────────────────────────────────────────  │
│  Utilisation             82.2%      82.0%     -0.2%        │
│  Cost per Active User    £37.34     £37.40    +£0.06       │
│                                                             │
│  [View Full Trend] [Download Report] [Schedule Email]       │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2 Department Leaderboard

```
┌─────────────────────────────────────────────────────────────┐
│  DEPARTMENT EFFICIENCY RANKING                              │
├─────────────────────────────────────────────────────────────┤
│  Rank  Department          Users  Util%  Issues  Score     │
│  ──────────────────────────────────────────────────────────│
│  🥇 1   Engineering         245    94%    3       98        │
│  🥈 2   Customer Service    189    91%    8       95        │
│  🥉 3   Marketing           67     89%    4       92        │
│  ⚠️ 4   Sales               312    78%    47      71        │
│  ⚠️ 5   Finance             89     72%    23      64        │
│  🔴 6   HR                  45     58%    18      42        │
│                                                             │
│  Score = (Utilisation × 0.6) + (100 - Issue% × 0.4)        │
└─────────────────────────────────────────────────────────────┘
```

#### 3.3 ROI Calculator & Savings Tracker

```
┌─────────────────────────────────────────────────────────────┐
│  SAVINGS TRACKER                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ IDENTIFIED  │  │ IN PROGRESS │  │  REALISED   │         │
│  │  £287,440   │  │   £45,200   │  │  £142,800   │         │
│  │   /year     │  │   /year     │  │   /year     │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ────────────────────────────────────────────────────────   │
│  This Quarter Progress:                                     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░  49.7% of target          │
│  £142,800 of £287,440 realised                             │
│                                                             │
│  Recent Wins:                                               │
│  • Jan 15: Removed 89 disabled licences (+£38,520)         │
│  • Jan 22: Downgraded 45 E5→E3 users (+£10,260)            │
│  • Feb 01: Reclaimed 67 inactive licences (+£24,156)       │
└─────────────────────────────────────────────────────────────┘
```

---

### Phase 4: UX/UI Modernisation

#### 4.1 New Dashboard Layout

**Before (V2):** Tab-based, static KPI cards, basic tables

**After (V3):** Command center design with:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  LICENCE INTELLIGENCE                              🔔 3  ⚙️  👤 Admin   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  💷 £287K POTENTIAL SAVINGS IDENTIFIED                           │  │
│  │  ████████████████████████░░░░░░░░  £142K realised (49.7%)       │  │
│  │  [View Opportunities →]                                          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │
│  │   2,912     │ │    82%      │ │   £89.3K    │ │    792      │      │
│  │ Licensed    │ │ Utilisation │ │ Monthly     │ │ Issues      │      │
│  │ Users       │ │             │ │ Spend       │ │ ▼55 (-6.5%) │      │
│  │ ▲65 (+2.3%) │ │ ▼0.2%       │ │ ▲£1.9K      │ │             │      │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘      │
│                                                                         │
│  ┌────────────────────────────────┐ ┌────────────────────────────────┐ │
│  │  QUICK ACTIONS                 │ │  ALERTS                        │ │
│  │  ┌──────────────────────────┐  │ │  🔴 47 disabled with licences  │ │
│  │  │ 📋 Review 792 issues     │  │ │  🔴 E3 pool at 94% capacity   │ │
│  │  │ 📉 Process downgrades    │  │ │  🟡 156 downgrade candidates   │ │
│  │  │ 📊 Generate report       │  │ │  🟡 Renewal in 45 days        │ │
│  │  │ ⚡ Run optimization      │  │ │  🟢 12 issues resolved today   │ │
│  │  └──────────────────────────┘  │ │                                │ │
│  └────────────────────────────────┘ └────────────────────────────────┘ │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  SPEND TREND                           │  UTILISATION BY SKU     │  │
│  │  ╭──────────────────╮                  │  E5  ████████░░  82%    │  │
│  │  │    ╱╲            │                  │  E3  █████████░  91%    │  │
│  │  │   ╱  ╲   ╱╲      │                  │  F3  ███████░░░  74%    │  │
│  │  │  ╱    ╲ ╱  ╲     │                  │  BB  ██████░░░░  65%    │  │
│  │  │ ╱      ╳    ╲    │                  │                         │  │
│  │  ╰──────────────────╯                  │  [View All SKUs →]      │  │
│  │  Sep Oct Nov Dec Jan Feb               │                         │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4.2 Component Library Expansion

**New Components:**

| Component | Purpose |
|-----------|---------|
| `AlertBanner` | Dismissable alerts with severity levels |
| `ProgressTracker` | Savings realisation progress |
| `ComparisonCard` | Month-over-month delta display |
| `Heatmap` | Feature utilization visualization |
| `Leaderboard` | Department ranking table |
| `ActionPanel` | Bulk action interface |
| `Timeline` | Recent activity feed |
| `FilterBar` | Advanced filtering with saved views |
| `SparklineKpi` | KPI card with inline trend chart |
| `RenewalCalendar` | Upcoming contract dates |

#### 4.3 Responsive Design

```
Desktop (1200px+)     Tablet (768px)       Mobile (375px)
┌────────────────┐   ┌──────────────┐     ┌─────────┐
│ ┌──┐ ┌──┐ ┌──┐ │   │ ┌──┐ ┌──┐   │     │ ┌─────┐ │
│ └──┘ └──┘ └──┘ │   │ └──┘ └──┘   │     │ └─────┘ │
│ ┌────┐ ┌────┐  │   │ ┌──┐ ┌──┐   │     │ ┌─────┐ │
│ │    │ │    │  │   │ └──┘ └──┘   │     │ └─────┘ │
│ └────┘ └────┘  │   │ ┌────────┐  │     │ ┌─────┐ │
│ ┌────────────┐ │   │ │        │  │     │ │     │ │
│ │            │ │   │ └────────┘  │     │ └─────┘ │
│ └────────────┘ │   └──────────────┘     └─────────┘
└────────────────┘   2-col grid           Stacked
4-col grid
```

---

### Phase 5: Integrations & Automation

#### 5.1 Power BI Embedded
- Embed Power BI reports directly in dashboard
- Pre-built report templates for executives
- Drill-through from dashboard to Power BI

#### 5.2 Microsoft Teams Integration
- Teams bot for alerts and quick queries
- Adaptive cards for approval workflows
- Channel notifications for thresholds

#### 5.3 ServiceNow / ITSM Integration
- Auto-create tickets for licence issues
- Link to CMDB for asset management
- Change request workflows for downgrades

#### 5.4 Scheduled Reports
- Daily/weekly/monthly email digests
- PDF report generation
- Custom report builder

---

## Technical Architecture Changes

### New SharePoint Lists Required

| List | Purpose | Fields |
|------|---------|--------|
| `LicenceUsageByService` | Per-user app activity | UPN, Teams%, SharePoint%, Exchange%, OneDrive%, etc. |
| `LicenceActions` | Action tracking | ActionId, Type, Status, UserIds, CreatedDate, CompletedDate |
| `LicenceAlerts` | Alert history | AlertId, Type, Severity, Message, Dismissed, DismissedBy |
| `LicenceTargets` | Savings targets | Quarter, Target, Achieved |
| `LicenceRules` | Custom rules | RuleId, Name, Condition, Action, Enabled |

### New Services

```typescript
// New services to add
services/
├── DowngradeEngine.ts       // Downgrade recommendation logic
├── AlertService.ts          // Alert management
├── ActionService.ts         // Bulk action orchestration
├── ReportService.ts         // Report generation
├── WorkflowService.ts       // Power Automate triggers
└── ComparisonService.ts     // Month-over-month analysis
```

### PowerShell Enhancements

```powershell
# New data extraction requirements
Get-LicenseIntelligence.ps1
├── -IncludeUsageByService   # Per-app activity (Graph Reports API)
├── -IncludeFeatureFlags     # Which E5 features in use
├── -IncludeGuestUsers       # External users with licences
├── -IncludeSharedMailboxes  # Shared mailboxes audit
└── -IncludeContractDates    # From HR/AD attributes
```

---

## Implementation Priorities

### Must Have (V3.0)
1. ✅ Downgrade recommendation engine
2. ✅ Action center with bulk operations
3. ✅ Month-over-month comparison
4. ✅ Savings tracker with realised savings
5. ✅ Alert system with dismissals
6. ✅ Responsive design

### Should Have (V3.1)
7. Feature utilization heatmap
8. Department leaderboard
9. Power Automate integration
10. Scheduled email reports
11. Custom filtering with saved views

### Nice to Have (V3.2)
12. Power BI embedding
13. Teams bot integration
14. ServiceNow connector
15. Custom rule builder
16. Predictive analytics (ML-based)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Issues identified | 792 | 1,200+ (with new detection) |
| Savings identified | £287K | £400K+ (with downgrades) |
| Savings realised | £0 (no tracking) | 60% of identified |
| Time to insight | Manual | < 30 seconds |
| User satisfaction | N/A | 4.5/5 stars |

---

## Competitive Positioning

| Feature | CoreView | Zylo | **Us (V3)** |
|---------|----------|------|-------------|
| Annual cost | £30-50K | £40-80K | **£0** |
| M365 native | Partial | No | **Yes** |
| SharePoint integrated | No | No | **Yes** |
| Customisable | Limited | Limited | **Fully** |
| Downgrade recommendations | ✓ | ✓ | **✓** |
| Bulk actions | ✓ | ✓ | **✓** |
| Savings tracking | ✓ | ✓ | **✓** |
| Power Automate | Limited | No | **Native** |

**Our Advantage:** Zero cost, fully customisable, native SharePoint/Teams integration, owned by IT (no vendor lock-in).

---

## Next Steps

1. **Review & Approve** this proposal
2. **Prioritise** features for V3.0 scope
3. **Enhance PowerShell** script for new data points
4. **Design** new component wireframes
5. **Implement** in phases

---

*Document created: February 2026*
*Author: Claude Code + Samuel Nwangwu*
