# Task: IPAM Dashboard Embedded Visuals in CloudPlatform Web Part

## Objective

Add a live networking dashboard to the Azure CloudPlatform web part's Networking section that pulls data from the Azure IPAM REST API and displays embedded visuals (VNet summary, subnet utilisation, key stats). When the user clicks the "Networking" sidebar nav item, instead of just showing documents, they also see live IPAM data.

## IPAM API Details

- **Base URL:** `https://lbripam-g6jyrscvaao6k.azurewebsites.net`
- **Swagger docs:** `{base}/api/docs`
- **Auth:** Entra ID OAuth (MSAL). The IPAM Engine app registration is `Lebara-IPAM-Engine`.
- **Key endpoints:**
  - `GET /api/azure/vnets` - Returns all VNets with: name, address space, subscription, resource group, subnets array, total IPs, used IPs
  - `GET /api/azure/subnets` - Returns all subnets with utilisation data
  - `GET /api/azure/endpoints` - Returns all endpoints (NICs with assigned IPs)
  - `GET /api/spaces` - Returns configured Spaces with utilisation
  - `GET /api/status` - Engine health check

## Architecture

### Auth Pattern

SPFx provides `AadHttpClientFactory` for calling Entra-protected APIs. This is the correct pattern:

```typescript
// In the WebPart class (CloudPlatformWebPart.ts), create the client:
const aadClient = await this.context.aadHttpClientFactory.getClient(
  'api://IPAM_ENGINE_APP_ID'  // The Application ID URI of Lebara-IPAM-Engine
);

// Then pass it to the React component as a prop
```

**IMPORTANT:** The IPAM Engine app registration's Application ID URI needs to be looked up. Check the Entra portal or use:
```
az ad app list --display-name "Lebara-IPAM-Engine" --query "[].{appId:appId, identifierUris:identifierUris}" -o json
```

The web part also needs an API permission grant in SharePoint Admin. This is done by adding the API to `config/package-solution.json` under `webApiPermissionRequests`:

```json
"webApiPermissionRequests": [
  {
    "resource": "Lebara-IPAM-Engine",
    "scope": "user_impersonation"
  }
]
```

After deploying the updated .sppkg, a SharePoint Admin must approve the API permission in SharePoint Admin Centre > API access.

### New Files

```
src/webparts/cloudPlatform/
  services/
    IpamService.ts          # Service class for IPAM API calls
  components/
    NetworkingDashboard.tsx  # Main networking dashboard component
    NetworkingDashboard.module.scss  # Styles for the dashboard
```

### Modified Files

```
src/webparts/cloudPlatform/
  CloudPlatformWebPart.ts    # Add AadHttpClient creation, pass as prop
  CloudPlatform.tsx           # Conditionally render NetworkingDashboard for networking section
  ICloudPlatformProps.ts      # Add aadHttpClient prop
config/
  package-solution.json       # Add webApiPermissionRequests
```

## Implementation Details

### 1. IpamService.ts

Create a service class that wraps IPAM API calls:

```typescript
import { AadHttpClient, HttpClientResponse } from '@microsoft/sp-http';

export interface IVNet {
  name: string;
  id: string;
  subscription_id: string;
  resource_group: string;
  address_space: string[];  // CIDR blocks
  subnets: ISubnet[];
  size: number;             // Total IPs
  used: number;             // Used IPs
}

export interface ISubnet {
  name: string;
  prefix: string;           // CIDR
  size: number;
  used: number;
}

export interface IIpamSummary {
  totalVnets: number;
  totalSubnets: number;
  totalEndpoints: number;
  totalIPs: number;
  usedIPs: number;
  utilisationPct: number;
  topUtilisedSubnets: ISubnet[];    // Top 5 most utilised
  leastUtilisedSubnets: ISubnet[];  // Top 5 least utilised (with >0 usage)
  vnets: IVNet[];
}

export class IpamService {
  private client: AadHttpClient;
  private baseUrl: string = 'https://lbripam-g6jyrscvaao6k.azurewebsites.net';

  constructor(client: AadHttpClient) {
    this.client = client;
  }

  public async getVnets(): Promise<IVNet[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/azure/vnets`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getSubnets(): Promise<ISubnet[]> { ... }
  public async getEndpoints(): Promise<any[]> { ... }
  
  public async getSummary(): Promise<IIpamSummary> {
    // Fetch vnets and endpoints in parallel
    // Calculate summary stats
    // Sort subnets by utilisation for top/bottom 5
    // Return aggregated summary object
  }
}
```

### 2. NetworkingDashboard.tsx

A React component that renders when `activeSection === 'networking'`. It should include:

#### a) Summary Stats Row (4 cards)
- Total VNets (count)
- Total Subnets (count)
- IP Utilisation (percentage with colour indicator)
- Endpoints (count of assigned IPs)

Style these like the existing `quickStats` section but with a networking theme.

#### b) Top Utilised Subnets (compact table or card grid)
Show the 5-8 most utilised subnets with:
- Subnet name + parent VNet name
- CIDR range
- Utilisation bar (coloured: green <60%, amber 60-85%, red >85%)
- Used/Total IPs text

#### c) VNet Overview (compact table, scrollable, max 10 rows)
- VNet name
- Address space
- Subnet count
- Utilisation mini-bar
- Subscription name (truncated)

#### d) "Open Full Dashboard" button
Link to `https://lbripam-g6jyrscvaao6k.azurewebsites.net` in new tab.

#### Design Guidelines
- Follow existing card/section patterns from CloudPlatform.module.scss
- Use the same `sectionCard`, `sectionHeader`, `sectionContent` structure
- Utilisation bars: simple div-within-div, coloured by threshold
- Colour palette: use Azure blue (#0078D4) as primary, with green/amber/red for utilisation
- No external component libraries - plain React + SCSS modules
- Loading state: show skeleton/spinner while IPAM data loads
- Error state: show friendly message with "Open IPAM Dashboard" fallback link
- The dashboard sits ABOVE the documents list for the networking section (docs still show below)

### 3. CloudPlatform.tsx Changes

In the content area where documents are rendered, add a conditional check:

```tsx
{/* Content Area */}
<div className={styles.contentArea}>
  {/* ... existing stats overview ... */}
  
  {/* IPAM Dashboard - only for networking section on Azure platform */}
  {platform === 'azure' && activeSection === 'networking' && aadHttpClient && (
    <NetworkingDashboard aadHttpClient={aadHttpClient} />
  )}
  
  {/* Existing document section continues below */}
  <section className={styles.sectionCard}>
    {/* ... existing doc rendering ... */}
  </section>
</div>
```

### 4. CloudPlatformWebPart.ts Changes

Add AadHttpClient setup:

```typescript
import { AadHttpClient } from '@microsoft/sp-http';

// In the render method or onInit:
private aadHttpClient: AadHttpClient | undefined;

protected async onInit(): Promise<void> {
  try {
    this.aadHttpClient = await this.context.aadHttpClientFactory.getClient(
      'api://IPAM_ENGINE_APP_ID'  // Replace with actual app ID URI
    );
  } catch (error) {
    console.warn('IPAM API client not available:', error);
    // Non-fatal - web part works without IPAM data
  }
  return super.onInit();
}

// Pass to React component:
React.createElement(CloudPlatform, {
  platform: this.properties.platform || 'aws',
  spHttpClient: this.context.spHttpClient,
  siteUrl: this.context.pageContext.web.absoluteUrl,
  customStats: this.properties.customStats,
  aadHttpClient: this.aadHttpClient  // NEW
});
```

### 5. ICloudPlatformProps.ts

Add the new prop:

```typescript
import { AadHttpClient } from '@microsoft/sp-http';

export interface ICloudPlatformProps {
  platform: 'aws' | 'azure';
  spHttpClient: any;
  siteUrl: string;
  customStats: string;
  aadHttpClient?: AadHttpClient;  // NEW - optional, only available for Azure
}
```

### 6. package-solution.json

Add under `solution`:

```json
"webApiPermissionRequests": [
  {
    "resource": "Lebara-IPAM-Engine",
    "scope": "user_impersonation"
  }
]
```

## Styling Reference

Use these existing SCSS class patterns from CloudPlatform.module.scss:

- `.sectionCard` - White card with border-radius 12px, shadow
- `.sectionHeader` - Flex row with title and action link
- `.sectionTitle` - 16px semibold with icon
- `.sectionContent` - Padding container
- `.quickStats` / `.quickStat` - Grid of stat cards

New SCSS classes needed in NetworkingDashboard.module.scss:
- `.utilisationBar` - Container div, 8px height, border-radius 4px, background #eee
- `.utilisationFill` - Inner div, height 100%, border-radius 4px, width based on percentage
- `.utilisationGreen` - background #107C10
- `.utilisationAmber` - background #FF8C00
- `.utilisationRed` - background #D13438
- `.subnetRow` - Flex row for subnet table items
- `.vnetRow` - Flex row for VNet table items
- `.dashboardButton` - Styled link button to open full IPAM dashboard

## Error Handling

- If `aadHttpClient` is undefined (permission not granted), show a static card with:
  "IPAM integration pending. Open the full dashboard:" + link
- If API calls fail, show error state with retry button + dashboard link
- Network timeout: 10 second timeout on API calls
- Cache IPAM data in component state, refresh on section re-entry (don't poll)

## Testing

1. `gulp build` must pass with no errors
2. `gulp serve` - test locally (IPAM data won't load without API permission, but component should render gracefully)
3. After deploy + API permission approval, verify live data loads on the Azure platform page

## Post-Deployment Steps (Manual)

After the .sppkg is deployed with the new API permission request:

1. Go to SharePoint Admin Centre > API access
2. Approve the pending request for "Lebara-IPAM-Engine"
3. Verify the Azure CloudPlatform page shows live IPAM data in the Networking section

## Pre-flight Check

Before starting, run this to get the IPAM Engine app ID:
```bash
az ad app list --display-name "Lebara-IPAM-Engine" --query "[].{appId:appId, identifierUris:identifierUris}" -o json
```

Use the `appId` or `identifierUris[0]` value in the `AadHttpClientFactory.getClient()` call and in `package-solution.json`.

## Definition of Done

- [ ] IpamService.ts created with typed interfaces and API methods
- [ ] NetworkingDashboard.tsx renders summary stats, subnet utilisation, VNet overview
- [ ] NetworkingDashboard.module.scss with utilisation bars and consistent styling
- [ ] CloudPlatformWebPart.ts creates AadHttpClient in onInit
- [ ] ICloudPlatformProps.ts updated with optional aadHttpClient prop
- [ ] CloudPlatform.tsx conditionally renders NetworkingDashboard for networking section
- [ ] package-solution.json has webApiPermissionRequests
- [ ] Graceful degradation when IPAM is unavailable
- [ ] `gulp build` passes cleanly