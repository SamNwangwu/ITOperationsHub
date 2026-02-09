# IT Operations Homepage - SPFx Web Part

A reusable, configurable SharePoint Framework web part for IT Operations Hub site homepages.

## Overview

One web part, multiple configurations. Deploy once to tenant app catalog, use on any site with different settings.

## Features

- **Branded Hero Banner** - Configurable title, subtitle, background colour/image
- **Status Indicators** - Shows system health (can integrate with New Relic API)
- **Platform Cards** - Clickable cards linking to subsites/pages (AWS, Azure, etc.)
- **Quick Links Grid** - Configurable link tiles with icons
- **Architecture Diagrams Section** - Image gallery with captions
- **Responsive Design** - Works on desktop and mobile

## Prerequisites

- Node.js 18.x (LTS)
- SharePoint Online tenant
- App Catalog enabled (tenant or site collection level)
- Global Admin or SharePoint Admin for deployment

## Local Development Setup

```bash
# Install dependencies
npm install

# Install SPFx globally (if not already)
npm install -g @microsoft/generator-sharepoint

# Trust dev certificate (first time only)
gulp trust-dev-cert

# Serve locally
gulp serve
```

## Configuration Options

When you add the web part to a page, you can configure:

| Property | Type | Description |
|----------|------|-------------|
| siteType | Choice | Infrastructure / IAM / Platform / ServiceMgmt / Security / Hub |
| heroTitle | String | Main heading text |
| heroSubtitle | String | Subtitle text |
| heroBackground | Colour | Background colour (hex) |
| heroImage | URL | Optional background image |
| showStatusBadge | Boolean | Show system health indicator |
| statusApiUrl | URL | New Relic API endpoint (optional) |
| platformCards | Collection | Array of card configs (title, description, url, icon, colour) |
| quickLinks | Collection | Array of link configs (title, url, icon) |
| showArchitectureDiagrams | Boolean | Show/hide diagrams section |
| diagramsLibraryUrl | URL | Document library containing diagram images |

## Project Structure

```
spfx-itops-homepage/
├── config/                     # SPFx build configuration
├── src/
│   └── webparts/
│       └── itOpsHomepage/
│           ├── ItOpsHomepageWebPart.ts       # Web part entry point
│           ├── ItOpsHomepageWebPart.manifest.json
│           ├── components/
│           │   ├── ItOpsHomepage.tsx         # Main component
│           │   ├── ItOpsHomepage.module.scss # Styles
│           │   ├── HeroBanner.tsx            # Hero section
│           │   ├── PlatformCards.tsx         # Platform card grid
│           │   ├── QuickLinksGrid.tsx        # Quick links
│           │   ├── ArchitectureDiagrams.tsx  # Diagrams gallery
│           │   └── StatusBadge.tsx           # Health indicator
│           └── loc/                          # Localisation strings
├── package.json
├── tsconfig.json
└── gulpfile.js
```

## Build & Deploy

```bash
# Build production bundle
gulp bundle --ship

# Create .sppkg package
gulp package-solution --ship

# Package will be in: sharepoint/solution/it-ops-homepage.sppkg
```

### Deploy to Tenant App Catalog

1. Go to SharePoint Admin Center > More features > Apps > App Catalog
2. Upload `it-ops-homepage.sppkg`
3. Check "Make this solution available to all sites in the organization"
4. Click Deploy

### Add to a Site

1. Go to site homepage > Edit
2. Add web part > Search "IT Operations Homepage"
3. Configure properties in the panel
4. Save and publish

## Maintenance Guide

### Staying Compatible with Microsoft Updates

1. **Subscribe to changelog**: https://developer.microsoft.com/en-us/microsoft-365/changelog
2. **Check quarterly** for SPFx updates
3. **Test in dev tenant** before upgrading production

### Upgrading SPFx Version

```bash
# Check current version
npm list @microsoft/sp-core-library

# Update SPFx packages (test thoroughly after!)
npm install @microsoft/sp-core-library@latest
npm install @microsoft/sp-webpart-base@latest
npm install @microsoft/sp-property-pane@latest

# Rebuild and test
gulp clean
gulp build
gulp serve
```

### Version Pinning (Recommended)

In `package.json`, use exact versions not ranges:

```json
"dependencies": {
  "@microsoft/sp-core-library": "1.18.2",  // Not "^1.18.2"
  "@microsoft/sp-webpart-base": "1.18.2"
}
```

### CI/CD Pipeline (Optional)

Set up GitHub Actions or Azure DevOps to:
1. Run `npm install && gulp build` on PRs
2. Run `gulp bundle --ship && gulp package-solution --ship` on merge to main
3. Upload .sppkg to App Catalog via PnP PowerShell

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Web part not appearing | Check App Catalog deployment, site app permissions |
| Styles not loading | Clear browser cache, check .scss imports |
| API calls failing | Check CORS, API permissions in Entra |
| Build errors after upgrade | Delete node_modules, package-lock.json, reinstall |

## Lebara Branding

| Colour | Hex | CSS Variable |
|--------|-----|--------------|
| Primary Blue | #00289e | --lebara-primary |
| Magenta | #E4007D | --lebara-accent |
| Light Blue | #00A4E4 | --lebara-secondary |
| Dark Blue | #001a4d | --lebara-dark |

## License

Internal use only - Lebara Ltd.
