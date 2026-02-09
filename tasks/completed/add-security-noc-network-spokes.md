# Add Security, NOC & Network Infrastructure Pages -- Task

## Context

The IT Operations Hub SPFx solution (`spfx-itops-homepage`) uses a configurable web part with site type presets defined in `SITE_CONFIGS` in `ItOpsHomepageWebPart.ts`. Currently there are 5 site types: Hub, Infrastructure, IAM, Platform, ServiceMgmt.

We are adding:
1. **Security Operations** -- new top-level spoke (new SharePoint site, new site type)
2. **NOC** -- sub-page under Infrastructure (new cards on Infrastructure config)
3. **Network Infrastructure** -- sub-page under Infrastructure (new cards on Infrastructure config)

Work through each patch sequentially. Run `npm run build` after each patch to confirm clean compilation before moving to the next.

---

## Patch 1: Add Security Site Type to SITE_CONFIGS

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

Add a new `Security` entry to the `SITE_CONFIGS` object, after the `ServiceMgmt` entry.

```typescript
'Security': {
    title: 'Security Operations',
    subtitle: 'Threat management, compliance, and security posture',
    background: '#C41E3A',
    platformCards: [
      {
        title: 'Vulnerability Management',
        description: 'Rapid7 scan coverage, aging vulnerabilities, remediation SLAs',
        url: 'SitePages/VulnerabilityManagement.aspx',
        icon: '\uD83D\uDEE1\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#8B0000'
      },
      {
        title: 'Cloud Security Posture',
        description: 'Wiz findings, misconfigurations, compliance frameworks',
        url: 'SitePages/CloudSecurityPosture.aspx',
        icon: '\u2601\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#A0153E'
      },
      {
        title: 'Data Security & DLP',
        description: 'Varonis alerts, sensitive data exposure, Purview DLP policies',
        url: 'SitePages/DataSecurity.aspx',
        icon: '\uD83D\uDD12',
        colour: '#ffffff',
        backgroundColour: '#B22222'
      },
      {
        title: 'Privileged Access (PAM)',
        description: 'CyberArk sessions, password rotation, vault onboarding',
        url: 'SitePages/PrivilegedAccess.aspx',
        icon: '\uD83D\uDD10',
        colour: '#ffffff',
        backgroundColour: '#9B1B30'
      },
      {
        title: 'SIEM & Threat Detection',
        description: 'Sentinel alerts, MTTR, incident trends, false positive rates',
        url: 'SitePages/SIEMThreatDetection.aspx',
        icon: '\uD83D\uDEA8',
        colour: '#ffffff',
        backgroundColour: '#800020'
      },
      {
        title: 'Security Awareness',
        description: 'KnowBe4 training completion, phishing simulation results',
        url: 'SitePages/SecurityAwareness.aspx',
        icon: '\uD83C\uDF93',
        colour: '#ffffff',
        backgroundColour: '#C41E3A'
      }
    ],
    quickLinks: [
      { title: 'Rapid7 Console', url: 'https://insight.rapid7.com', icon: '\uD83D\uDEE1\uFE0F' },
      { title: 'Wiz Portal', url: 'https://app.wiz.io', icon: '\u2601\uFE0F' },
      { title: 'Microsoft Sentinel', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights', icon: '\uD83D\uDD0D' },
      { title: 'CyberArk', url: 'https://cyberark.lebara.com', icon: '\uD83D\uDD10' },
      { title: 'Purview Compliance', url: 'https://compliance.microsoft.com', icon: '\uD83D\uDCCB' },
      { title: 'KnowBe4', url: 'https://training.knowbe4.com', icon: '\uD83C\uDF93' }
    ]
  }
```

### Verification
- `npm run build` passes
- Security config accessible via `SITE_CONFIGS['Security']`

---

## Patch 2: Add Security to Property Pane Dropdown

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In `getPropertyPaneConfiguration()`, find the `PropertyPaneDropdown('siteType', ...)` options array. Add after the ServiceMgmt entry:

```typescript
{ key: 'Security', text: 'Security Operations' }
```

The full options array should now be:
```typescript
options: [
  { key: 'Hub', text: 'IT Operations Hub' },
  { key: 'Infrastructure', text: 'Infrastructure' },
  { key: 'IAM', text: 'Identity & Access Management' },
  { key: 'Platform', text: 'Platform Engineering' },
  { key: 'ServiceMgmt', text: 'Service Management' },
  { key: 'Security', text: 'Security Operations' }
],
```

### Verification
- `npm run build` passes
- Dropdown shows 6 options

---

## Patch 3: Add Security Card to Hub Config

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In `SITE_CONFIGS['Hub'].platformCards`, add a new card for Security after the Service Management card:

```typescript
{
  title: 'Security Operations',
  description: 'Threat management, compliance & posture',
  url: '/sites/ITOps-Security',
  icon: '\uD83D\uDEE1\uFE0F',
  colour: '#ffffff',
  backgroundColour: '#C41E3A'
}
```

### Verification
- `npm run build` passes
- Hub config now has 5 platform cards

---

## Patch 4: Add NOC and Network Infrastructure Cards to Infrastructure Config

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In `SITE_CONFIGS['Infrastructure'].platformCards`, there are currently 2 cards (AWS, Azure). Add 2 more cards after Azure:

```typescript
{
  title: 'Network Operations (NOC)',
  description: 'Monitoring, patching, availability & incident response',
  url: 'SitePages/NOC.aspx',
  icon: '\uD83D\uDCE1',
  colour: '#ffffff',
  backgroundColour: '#003366'
},
{
  title: 'Network Infrastructure',
  description: 'VPN, ExpressRoute, RADIUS, DNS & connectivity',
  url: 'SitePages/NetworkInfra.aspx',
  icon: '\uD83C\uDF10',
  colour: '#ffffff',
  backgroundColour: '#001a4d'
}
```

### Verification
- `npm run build` passes
- Infrastructure config now has 4 platform cards (AWS, Azure, NOC, Network Infrastructure)

---

## Patch 5: Add NOC Quick Links to Infrastructure Config

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In `SITE_CONFIGS['Infrastructure'].quickLinks`, add the following links. The current list has: New Relic, AWS Console, Azure Portal, Runbooks, Escalation, Certificates. Keep all existing links and add:

```typescript
{ title: 'Azure Monitor', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Monitoring', icon: '\uD83D\uDCCA' },
{ title: 'Patch Schedule', url: 'SitePages/PatchSchedule.aspx', icon: '\uD83D\uDD27' }
```

### Verification
- `npm run build` passes
- Infrastructure quick links now has 8 items

---

## Patch 6: Update Documentation

### File: `docs/IT-Operations-Homepage-Documentation.md`

In the "Sites Using This Web Part" table, add:

```
| Security Operations | /sites/ITOps-Security | `Security` |
```

In the "Site Type Presets" section, add a new subsection after ServiceMgmt:

```markdown
#### Security
- **Title:** Security Operations
- **Subtitle:** Threat management, compliance, and security posture
- **Background:** #C41E3A
- **Cards:** Vulnerability Management, Cloud Security Posture, Data Security & DLP, Privileged Access (PAM), SIEM & Threat Detection, Security Awareness
- **Quick Links:** Rapid7 Console, Wiz Portal, Microsoft Sentinel, CyberArk, Purview Compliance, KnowBe4
```

Also update the Infrastructure preset description to note the new cards:

```markdown
#### Infrastructure
- **Title:** Infrastructure Services
- **Subtitle:** Cloud platforms, networking, and core systems
- **Background:** #00289e
- **Cards:** AWS, Azure, Network Operations (NOC), Network Infrastructure
- **Quick Links:** New Relic, AWS Console, Azure Portal, Runbooks, Escalation, Certificates, Azure Monitor, Patch Schedule
```

### Verification
- Documentation accurately reflects all config changes

---

## Patch 7: Update README

### File: `README.md`

In the Configuration Options table, update the `siteType` row to:

```
| siteType | Choice | Infrastructure / IAM / Platform / ServiceMgmt / Security / Hub |
```

### Verification
- `npm run build` still passes (this is a docs-only change)

---

## General Rules

1. TypeScript strict mode must pass -- no `any` types, no implicit nulls.
2. Do not add new npm dependencies.
3. Do not modify component files (ItOpsHomepage.tsx, PlatformCards.tsx, etc.) -- these already render dynamically from the config.
4. Do not modify SCSS files -- the existing styles handle any number of cards.
5. Preserve Lebara brand colours and the existing dark card aesthetic.
6. Unicode emoji escapes are used intentionally for TypeScript compatibility -- do not replace with literal emoji characters.
7. Test `npm run build` after each patch before moving to the next.
8. URLs marked as placeholders will be updated after team consultations.