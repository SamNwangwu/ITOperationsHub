# IT Operations Homepage - SPFx Web Part

## Documentation for Future Teams

**Project:** IT Operations Homepage Web Part  
**Created:** February 2026  
**Author:** Sam Nwangwu, Infrastructure Team  
**Repository:** https://dev.azure.com/lebara/Lebara.SharePointITOpsHub/_git/spfx-itops-homepage

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [CI/CD Pipeline](#cicd-pipeline)
4. [Local Development](#local-development)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Troubleshooting](#troubleshooting)
8. [Maintenance](#maintenance)

---

## Overview

### What is this?

A reusable SharePoint Framework (SPFx) web part that provides a configurable homepage for all IT Operations Hub sites. One deployment serves five different sites with different configurations.

### Sites Using This Web Part

| Site | URL | Site Type Config |
|------|-----|------------------|
| IT Operations Hub | /sites/ITOpsHub | `Hub` |
| Infrastructure | /sites/Infrastructure | `Infrastructure` |
| Identity & Access | /sites/ITOps-IAM | `IAM` |
| Platform Engineering | /sites/ITOps-Platform | `Platform` |
| Service Management | /sites/ITOps-ServiceMgmt | `ServiceMgmt` |
| Security Operations | /sites/ITOps-Security | `Security` |

### Features

- **Auto-configuration** - Select site type, content auto-populates
- **Full-width support** - Spans entire page width
- **Branded hero banner** - Lebara colours, configurable background
- **Platform cards** - Clickable cards linking to subsites/pages
- **Quick links grid** - Common tools and resources
- **Architecture diagrams section** - Placeholder for technical diagrams
- **Status badge** - Shows "All Systems Operational" (can integrate with New Relic)

---

## Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| Framework | SharePoint Framework (SPFx) | 1.18.2 |
| UI Library | React | 17.0.1 |
| Styling | SCSS Modules | - |
| Build Tool | Gulp | 4.x |
| Language | TypeScript | 4.7.4 |
| Package Manager | npm | 10.x |

### Project Structure

```
spfx-itops-homepage/
├── config/
│   ├── config.json              # Bundle configuration
│   ├── package-solution.json    # Solution packaging config
│   ├── serve.json               # Local dev server config
│   └── deploy-azure-storage.json
├── src/
│   └── webparts/
│       └── itOpsHomepage/
│           ├── ItOpsHomepageWebPart.ts       # Web part entry + property pane
│           ├── ItOpsHomepageWebPart.manifest.json
│           ├── components/
│           │   ├── ItOpsHomepage.tsx         # Main React component
│           │   ├── ItOpsHomepage.module.scss # Styles
│           │   └── IItOpsHomepageProps.ts    # TypeScript interfaces
│           └── loc/
│               ├── en-us.js                  # English strings
│               └── mystrings.d.ts            # String type definitions
├── azure-pipelines.yml          # CI/CD pipeline
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── gulpfile.js                 # Build tasks
└── README.md
```

### Lebara Branding

| Colour | Hex Code | Usage |
|--------|----------|-------|
| Primary Blue | `#00289e` | Headers, Hub background |
| Dark Blue | `#001a4d` | Dark backgrounds |
| Magenta | `#E4007D` | Accents (not currently used) |
| Light Blue | `#00A4E4` | Secondary elements |

---

## CI/CD Pipeline

### Pipeline Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DEVELOPER                                       │
│                         Push to main branch                                  │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRIGGER                                         │
│                    Path filter: src/*, config/*, package.json               │
└─────────────────────────────────┬───────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BUILD STAGE                                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Shallow     │  │ Setup       │  │ npm ci      │  │ Auto-increment      │ │
│  │ Clone       │─▶│ Node.js 18  │─▶│ (if not     │─▶│ version             │ │
│  │             │  │             │  │ cached)     │  │ 1.0.0.{BuildId}     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┬──────────┘ │
│                                                                 │            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────────┘          │
│  │ Publish     │  │ gulp        │  │ gulp bundle                            │
│  │ .sppkg      │◀─│ package     │◀─│ --ship                                 │
│  │ artifact    │  │ --ship      │  │                                        │
│  └──────┬──────┘  └─────────────┘  └────────────────────────────────────────┘
│         │                                                                    │
└─────────┼────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DEPLOY STAGE                                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ Download    │  │ Download    │  │ Load PnP    │  │ Connect to          │ │
│  │ artifact    │─▶│ certificate │─▶│ PowerShell  │─▶│ SharePoint          │ │
│  │             │  │ (.pfx)      │  │ (cached)    │  │ (cert auth)         │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └──────────┬──────────┘ │
│                                                                 │            │
│  ┌─────────────────────────────────────────────────────────────┘            │
│  │ Add-PnPApp -SkipFeatureDeployment                                        │
│  │ (Deploys to App Catalog, available to all sites)                         │
│  └──────────────────────────────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SHAREPOINT                                         │
│                                                                              │
│    App Catalog ──▶ Available to all sites ──▶ IT Ops Hub Sites              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Pipeline Features

| Feature | Benefit |
|---------|---------|
| **Shallow clone** | Faster checkout (~5s saved) |
| **npm cache** | Faster installs (~30s saved) |
| **node_modules cache** | Skip npm ci if cached (~40s saved) |
| **PnP.PowerShell cache** | Faster deployments (~15s saved) |
| **Auto-version** | Uses BuildId, no manual version bumps |
| **SkipFeatureDeployment** | Auto-enables "Available to all sites" |
| **Certificate auth** | Secure, no client secrets |

### Pipeline Variables

Stored in Variable Group: `spfx-deployment`

| Variable | Description | Secret? |
|----------|-------------|---------|
| `TENANT_ID` | Entra tenant ID | No |
| `CLIENT_ID` | App registration client ID | No |
| `APP_CATALOG_URL` | SharePoint App Catalog URL | No |
| `CERT_PASSWORD` | Certificate password | **Yes** |

### Secure Files

| File | Description |
|------|-------------|
| `SPFx-Pipeline.pfx` | Certificate for SharePoint auth |

---

## Local Development

### Prerequisites

- Node.js 18.x LTS
- npm 10.x
- gulp-cli (`npm install -g gulp-cli`)
- Access to SharePoint Online

### Setup

```bash
# Clone the repo
git clone https://dev.azure.com/lebara/Lebara.SharePointITOpsHub/_git/spfx-itops-homepage
cd spfx-itops-homepage

# Install dependencies
npm install

# Trust the dev certificate (first time only)
gulp trust-dev-cert

# Start local development server
gulp serve
```

### Testing Locally

1. Run `gulp serve`
2. Browser opens to SharePoint workbench
3. Add the "IT Operations Homepage" web part
4. Test configuration changes

### Building

```bash
# Development build
gulp build

# Production build
gulp bundle --ship
gulp package-solution --ship

# Output: sharepoint/solution/it-ops-homepage.sppkg
```

---

## Configuration

### Site Type Presets

When you select a Site Type in the web part property pane, content auto-populates:

#### Hub
- **Title:** IT Operations Hub
- **Subtitle:** Central hub for IT Operations documentation and resources
- **Background:** #00289e
- **Cards:** Links to all 4 spoke sites
- **Quick Links:** New Relic, Service Desk, Azure Portal, AWS Console, Runbooks, Escalation

#### Infrastructure
- **Title:** Infrastructure Services
- **Subtitle:** Cloud platforms, networking, and core systems
- **Background:** #00289e
- **Cards:** AWS, Azure, Network Operations (NOC), Network Infrastructure
- **Quick Links:** New Relic, AWS Console, Azure Portal, Runbooks, Escalation, Certificates, Azure Monitor, Patch Schedule

#### IAM
- **Title:** Identity & Access Management
- **Subtitle:** Licenses, joiners/movers/leavers, and access control
- **Background:** #5C2D91
- **Cards:** License Management, JML Tracker, Orphan Accounts, Entra ID
- **Quick Links:** Entra Admin, M365 Admin, License Report, JML Tracker, Cezanne HR, Service Desk

#### Platform
- **Title:** Platform Engineering
- **Subtitle:** Architecture decisions, infrastructure as code, and standards
- **Background:** #0078D4
- **Cards:** Architecture Decisions, Terraform Modules, GitHub, Azure DevOps
- **Quick Links:** GitHub, Azure DevOps, Terraform Registry, ADRs, Documentation, Standards

#### ServiceMgmt
- **Title:** Service Management
- **Subtitle:** Runbooks, escalation procedures, and knowledge base
- **Background:** #107C10
- **Cards:** Runbooks, Escalation Matrix, Knowledge Base, Service Desk
- **Quick Links:** Service Desk, Runbooks, Escalation, Knowledge Base, New Relic, PagerDuty

#### Security
- **Title:** Security Operations
- **Subtitle:** Threat management, compliance, and security posture
- **Background:** #C41E3A
- **Cards:** Vulnerability Management, Cloud Security Posture, Data Security & DLP, Privileged Access (PAM), SIEM & Threat Detection, Security Awareness
- **Quick Links:** Rapid7 Console, Wiz Portal, Microsoft Sentinel, CyberArk, Purview Compliance, KnowBe4

### Custom Configuration

You can override any preset by expanding the "Hero Banner (Optional Overrides)" or "Advanced: Custom Cards (JSON)" sections in the property pane.

#### Custom Platform Cards JSON Format

```json
[
  {
    "title": "Custom Card",
    "description": "Card description",
    "url": "/sites/SomeSite",
    "icon": "🚀",
    "colour": "#ffffff",
    "backgroundColour": "#0078D4"
  }
]
```

#### Custom Quick Links JSON Format

```json
[
  {
    "title": "Link Title",
    "url": "https://example.com",
    "icon": "🔗"
  }
]
```

---

## Deployment

### Automatic (CI/CD Pipeline)

1. Push changes to `main` branch
2. Pipeline automatically:
   - Builds the solution
   - Increments version
   - Deploys to App Catalog
   - Makes available to all sites

### Manual Deployment

If needed, you can deploy manually:

```powershell
# Build
gulp bundle --ship
gulp package-solution --ship

# Connect to SharePoint
Connect-PnPOnline -Url "https://lebara.sharepoint.com/sites/AppCatalog" -Interactive

# Deploy
Add-PnPApp -Path "./sharepoint/solution/it-ops-homepage.sppkg" -Scope Tenant -Overwrite -Publish -SkipFeatureDeployment
```

### Adding to a Page

1. Edit the page
2. Click **+** to add a web part
3. Search for "IT Operations Homepage"
4. Add to page
5. Select **Site Type** in the property pane
6. Publish

### Full-Width Layout

1. Edit the page
2. Hover over the section containing the web part
3. Click section settings (left side)
4. Select **Full-width column**
5. Publish

---

## Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Web part not appearing in toolbox | Not deployed to all sites | App Catalog → Deploy → Check "Make available to all sites" |
| Changes not reflecting | Browser cache | Hard refresh: Ctrl+Shift+R |
| Old version showing | App Catalog cache | Re-deploy from App Catalog |
| Pipeline fails - file checked out | Manual edit in App Catalog | Check in the file in App Catalog |
| Pipeline fails - auth error | Certificate expired | Renew certificate, upload to Entra & ADO |
| Build fails - npm errors | Corrupted cache | Delete node_modules, run `npm ci` |

### Checking Deployed Version

1. Go to App Catalog
2. Find `it-ops-homepage-client-side-solution`
3. Check "App version" column
4. Should match the BuildId from pipeline

### Viewing Pipeline Logs

1. Go to Azure DevOps → Pipelines
2. Click on the pipeline run
3. Click on failed stage/job
4. Review logs for errors

---

## Maintenance

### Updating SPFx Version

1. Check [SPFx releases](https://github.com/SharePoint/sp-dev-docs/wiki/SharePoint-Framework-release-notes)
2. Update `package.json` dependencies
3. Run `npm install`
4. Test locally with `gulp serve`
5. Push to main

### Certificate Renewal

Certificate expires: **February 2028** (2 years from creation)

To renew:
1. Generate new certificate (same process as initial setup)
2. Upload `.cer` to Entra app registration
3. Upload `.pfx` to ADO Secure Files (replace existing)
4. Update `CERT_PASSWORD` if changed

### Adding New Site Types

1. Edit `src/webparts/itOpsHomepage/ItOpsHomepageWebPart.ts`
2. Add new entry to `SITE_CONFIGS` object
3. Add new option to `PropertyPaneDropdown` in `getPropertyPaneConfiguration()`
4. Push to main

### Modifying Styles

1. Edit `src/webparts/itOpsHomepage/components/ItOpsHomepage.module.scss`
2. Use Lebara brand colours defined at top of file
3. Test locally before pushing

---

## Resources

### Internal Links

- **Repository:** https://dev.azure.com/lebara/Lebara.SharePointITOpsHub/_git/spfx-itops-homepage
- **Pipeline:** https://dev.azure.com/lebara/Lebara.SharePointITOpsHub/_build
- **App Catalog:** https://lebara.sharepoint.com/sites/AppCatalog
- **Entra App:** Azure Portal → Entra ID → App registrations → SPFx-Pipeline-Deployment

### External Documentation

- [SPFx Overview](https://docs.microsoft.com/en-us/sharepoint/dev/spfx/sharepoint-framework-overview)
- [PnP PowerShell](https://pnp.github.io/powershell/)
- [React Documentation](https://reactjs.org/docs/getting-started.html)

---

## Contact

**Maintained by:** Infrastructure Team  
**Original Author:** Sam Nwangwu  
**Questions:** Post in Teams → IT Operations Hub → General

---

*Last Updated: February 2026*
