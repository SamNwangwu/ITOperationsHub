# Add NOC & Network Infrastructure Site Type Configs -- Task

## Context

Follow-on from `add-security-noc-network-spokes.md` (commit `4af8d16`). The Infrastructure config already has cards linking to `SitePages/NOC.aspx` and `SitePages/NetworkInfra.aspx`. Now we need dedicated site type presets so the IT Ops Homepage web part can be dropped onto those pages with proper branded content.

Work through each patch sequentially. Run `npm run build` after each patch.

---

## Patch 1: Add NOC Site Type to SITE_CONFIGS

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

Add a new `NOC` entry to the `SITE_CONFIGS` object:

```typescript
'NOC': {
    title: 'Network Operations Centre',
    subtitle: 'Monitoring, patching, availability, and incident response',
    background: '#003366',
    platformCards: [
      {
        title: 'Monitoring & Alerting',
        description: 'NewRelic dashboards, uptime SLAs, alert noise ratio, MTTA/MTTR',
        url: 'SitePages/MonitoringAlerting.aspx',
        icon: '\uD83D\uDCE1',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'Patch Management',
        description: 'Server patch compliance, upcoming windows, OS version distribution',
        url: 'SitePages/PatchManagement.aspx',
        icon: '\uD83D\uDD27',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'Incident Management',
        description: 'P1/P2 incidents, escalation stats, RCA completion rates',
        url: 'SitePages/IncidentManagement.aspx',
        icon: '\uD83D\uDEA8',
        colour: '#ffffff',
        backgroundColour: '#003366'
      },
      {
        title: 'Availability & SLAs',
        description: 'Uptime by service/environment, planned vs unplanned downtime',
        url: 'SitePages/AvailabilitySLAs.aspx',
        icon: '\u2705',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'Capacity Monitoring',
        description: 'CPU/memory/disk trends, threshold breaches, forecasting',
        url: 'SitePages/CapacityMonitoring.aspx',
        icon: '\uD83D\uDCCA',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'Change Management',
        description: 'Scheduled maintenance, change success rate, emergency changes',
        url: 'SitePages/ChangeManagement.aspx',
        icon: '\uD83D\uDCC5',
        colour: '#ffffff',
        backgroundColour: '#003366'
      }
    ],
    quickLinks: [
      { title: 'NewRelic', url: 'https://one.newrelic.com', icon: '\uD83D\uDCCA' },
      { title: 'ManageEngine FixIt', url: 'https://fixit.lebara.com', icon: '\uD83C\uDFAB' },
      { title: 'Azure Monitor', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Monitoring', icon: '\uD83D\uDD0D' },
      { title: 'Patch Schedule', url: 'SitePages/PatchSchedule.aspx', icon: '\uD83D\uDCC5' },
      { title: 'Escalation Matrix', url: '/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '\uD83D\uDCDE' },
      { title: 'On-Call Rota', url: 'SitePages/OnCallRota.aspx', icon: '\uD83D\uDC64' }
    ]
  }
```

### Verification
- `npm run build` passes

---

## Patch 2: Add NetworkInfra Site Type to SITE_CONFIGS

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

Add a new `NetworkInfra` entry to the `SITE_CONFIGS` object:

```typescript
'NetworkInfra': {
    title: 'Network Infrastructure & Connectivity',
    subtitle: 'VPN, ExpressRoute, RADIUS, DNS, and network services',
    background: '#001a4d',
    platformCards: [
      {
        title: 'IPAM & Subnet Management',
        description: 'VNet utilisation, IP allocation, subnet capacity',
        url: '/sites/Infrastructure/SitePages/IPAM.aspx',
        icon: '\uD83C\uDF10',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'ExpressRoute & WAN',
        description: 'Circuit health, bandwidth utilisation, peering status',
        url: 'SitePages/ExpressRoute.aspx',
        icon: '\u26A1',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      },
      {
        title: 'VPN Services',
        description: 'Site-to-site tunnels, client VPN usage, split tunnel policies',
        url: 'SitePages/VPNServices.aspx',
        icon: '\uD83D\uDD12',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'RADIUS & NAC',
        description: 'Authentication success/failure rates, device compliance, 802.1X',
        url: 'SitePages/RadiusNAC.aspx',
        icon: '\uD83D\uDD11',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'DNS & DHCP',
        description: 'Scope utilisation, query volumes, zone health',
        url: 'SitePages/DnsDhcp.aspx',
        icon: '\uD83D\uDDA5\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      },
      {
        title: 'Firewall & Network Security',
        description: 'Rule reviews, ACL changes, policy compliance',
        url: 'SitePages/FirewallManagement.aspx',
        icon: '\uD83D\uDEE1\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      }
    ],
    quickLinks: [
      { title: 'Azure IPAM', url: 'https://ipam.lebara.com', icon: '\uD83C\uDF10' },
      { title: 'Network Watcher', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Network', icon: '\uD83D\uDD0D' },
      { title: 'ExpressRoute', url: 'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Network%2FexpressRouteCircuits', icon: '\u26A1' },
      { title: 'VPN Gateway', url: 'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Network%2FvirtualNetworkGateways', icon: '\uD83D\uDD12' },
      { title: 'Firewall Manager', url: 'https://portal.azure.com/#blade/Microsoft_Azure_HybridNetworking/FirewallManagerMenuBlade', icon: '\uD83D\uDEE1\uFE0F' },
      { title: 'Circuit Vendor Portal', url: 'https://vendor.placeholder.com', icon: '\uD83D\uDCDE' }
    ]
  }
```

### Verification
- `npm run build` passes

---

## Patch 3: Add Both to Property Pane Dropdown

### File: `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`

In `getPropertyPaneConfiguration()`, update the `PropertyPaneDropdown('siteType', ...)` options array to include both new types:

```typescript
options: [
  { key: 'Hub', text: 'IT Operations Hub' },
  { key: 'Infrastructure', text: 'Infrastructure' },
  { key: 'IAM', text: 'Identity & Access Management' },
  { key: 'Platform', text: 'Platform Engineering' },
  { key: 'ServiceMgmt', text: 'Service Management' },
  { key: 'Security', text: 'Security Operations' },
  { key: 'NOC', text: 'Network Operations Centre' },
  { key: 'NetworkInfra', text: 'Network Infrastructure' }
],
```

### Verification
- `npm run build` passes
- Dropdown shows 8 options

---

## Patch 4: Update Documentation

### File: `docs/IT-Operations-Homepage-Documentation.md`

In the "Sites Using This Web Part" table, add:

```
| Network Operations Centre | /sites/Infrastructure/SitePages/NOC.aspx | `NOC` |
| Network Infrastructure | /sites/Infrastructure/SitePages/NetworkInfra.aspx | `NetworkInfra` |
```

In the "Site Type Presets" section, add after Security:

```markdown
#### NOC
- **Title:** Network Operations Centre
- **Subtitle:** Monitoring, patching, availability, and incident response
- **Background:** #003366
- **Cards:** Monitoring & Alerting, Patch Management, Incident Management, Availability & SLAs, Capacity Monitoring, Change Management
- **Quick Links:** NewRelic, ManageEngine FixIt, Azure Monitor, Patch Schedule, Escalation Matrix, On-Call Rota

#### NetworkInfra
- **Title:** Network Infrastructure & Connectivity
- **Subtitle:** VPN, ExpressRoute, RADIUS, DNS, and network services
- **Background:** #001a4d
- **Cards:** IPAM & Subnet Management, ExpressRoute & WAN, VPN Services, RADIUS & NAC, DNS & DHCP, Firewall & Network Security
- **Quick Links:** Azure IPAM, Network Watcher, ExpressRoute, VPN Gateway, Firewall Manager, Circuit Vendor Portal
```

### Verification
- Documentation reflects all changes

---

## Patch 5: Update README

### File: `README.md`

Update the `siteType` row in the Configuration Options table:

```
| siteType | Choice | Infrastructure / IAM / Platform / ServiceMgmt / Security / NOC / NetworkInfra / Hub |
```

### Verification
- `npm run build` passes

---

## General Rules

1. TypeScript strict mode must pass -- no `any` types, no implicit nulls.
2. Do not add new npm dependencies.
3. Do not modify component files or SCSS -- the existing renderer handles any number of configs.
4. Unicode emoji escapes used intentionally -- do not replace with literal emoji.
5. Test `npm run build` after each patch before moving to the next.
6. Placeholder URLs will be updated after team consultations.