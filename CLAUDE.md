# CLAUDE.md - IT Operations Hub SPFx Project

## Project Overview

SharePoint Framework (SPFx) solution for Lebara's IT Operations Hub. One deployment, multiple web parts serving 5+ SharePoint sites across Infrastructure, IAM, Platform Engineering, and Service Management.

## Tech Stack

- **Framework:** SPFx 1.18.2 / React 17.0.1 / TypeScript 4.7.4
- **Styling:** SCSS Modules (component-scoped)
- **Build:** Gulp 4.x
- **CI/CD:** Azure DevOps pipeline (azure-pipelines.yml) with GitHub mirror
- **Target:** SharePoint Online tenant app catalog (lebaragroup.sharepoint.com)

## Repository Structure

```
spfx-itops-homepage/
├── src/webparts/
│   ├── itOpsHomepage/          # Main homepage web part (hub + spoke sites)
│   │   ├── ItOpsHomepageWebPart.ts
│   │   └── components/
│   │       ├── ItOpsHomepage.tsx
│   │       └── ItOpsHomepage.module.scss
│   ├── cloudPlatform/          # AWS/Azure platform documentation pages
│   │   ├── CloudPlatformWebPart.ts
│   │   └── CloudPlatform.tsx   # Contains PLATFORM_CONFIGS for AWS/Azure
│   │   └── CloudPlatform.module.scss
│   └── licenseManagement/      # M365 license audit & optimization dashboard
│       ├── LicenseManagementWebPart.ts
│       └── components/
├── config/                     # SPFx build config
├── docs/                       # Project documentation
├── tasks/                      # Task files for Claude Code execution
├── azure-pipelines.yml         # CI/CD: Build -> Deploy -> Mirror to GitHub
└── CLAUDE.md                   # This file
```

## Web Parts

### 1. IT Operations Homepage (`itOpsHomepage`)
Configurable homepage with hero banner, platform cards, quick links. Preset configs for: Hub, Infrastructure, IAM, Platform, ServiceMgmt.

### 2. Cloud Platform (`cloudPlatform`)
Documentation browser for AWS and Azure. Sidebar navigation pulls docs from SharePoint doc library folders. Config-driven via `PLATFORM_CONFIGS` object in `CloudPlatform.tsx`.

### 3. License Management (`licenseManagement`)
M365 license intelligence dashboard. Reads from SharePoint lists: LicenceUsers, LicenceSkus, LicencePricing, LicenceSnapshots, UsageReports. Calculates savings opportunities for dual-licensed, disabled, and inactive users.

## Key Patterns

- **Config-driven:** Web parts use configuration objects rather than hardcoded content. New sections/links/stats are added by modifying config objects.
- **SharePoint doc library integration:** CloudPlatform pulls documents from folder paths like `/sites/InfrastructureV2/Shared Documents/{platform}/{section}/`
- **SCSS Modules:** All styles are component-scoped. No global CSS.
- **Property pane:** Web part settings configurable by site owners without code changes.

## Branding

| Colour         | Hex     | Usage                    |
|----------------|---------|--------------------------|
| Primary Blue   | #00289e | Headers, Hub background  |
| Dark Blue      | #001a4d | Dark backgrounds         |
| Magenta        | #E4007D | Accents                  |
| Light Blue     | #00A4E4 | Secondary elements       |
| Azure Blue     | #0078D4 | Azure platform accent    |
| AWS Dark       | #232F3E | AWS platform primary     |
| AWS Orange     | #FF9900 | AWS platform accent      |

## Build Commands

```bash
npm install                    # Install dependencies
gulp build                     # Dev build
gulp serve                     # Local dev server + SharePoint workbench
gulp bundle --ship             # Production bundle
gulp package-solution --ship   # Create .sppkg for deployment
```

## Pipeline

Triggers on changes to `src/*`, `config/*`, `package.json`, `package-lock.json`. Stages: Build -> Deploy (to SP app catalog) -> Mirror (to GitHub for Claude Project sync).

## SharePoint Environment

- **Tenant:** lebaragroup.sharepoint.com
- **App Catalog:** lebaragroup.sharepoint.com/sites/appcatalog
- **Infrastructure Site:** /sites/InfrastructureV2
- **IAM Site:** /sites/ITOps-IAM
- **Hub Site:** /sites/ITOpsHub

## Azure IPAM Integration

IPAM Dashboard deployed at: https://lbripam-g6jyrscvaao6k.azurewebsites.net
- Integrated into CloudPlatform Azure config (Networking section + quick link)
- Doc folder: Azure/Networking in Infrastructure site doc library

## Task Execution

Check the `tasks/` folder for pending work items. Each task file contains a self-contained description of changes needed. After completing a task, move it to `tasks/completed/` with a completion note.

## Important Notes

- Do NOT modify `azure-pipelines.yml` unless specifically asked
- Do NOT modify `config/package-solution.json` versioning (auto-incremented by pipeline)
- Always use SCSS Modules for styling (never global CSS)
- the pipeline will reject broken builds
- Keep emoji icons consistent with existing patterns in config objects
- SharePoint list field names use PascalCase (e.g., SkuPartNumber, IssueType)
- PnP PowerShell batching has serialization bugs with Number fields - use non-batched writes for numeric data