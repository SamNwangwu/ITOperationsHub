import { AadHttpClient } from '@microsoft/sp-http';

// IPAM API response interfaces - nested structure from /api/spaces?expand=true
export interface IIpamSpaceResponse {
  name: string;
  desc: string;
  size: number;
  used: number;
  blocks?: IIpamBlockResponse[];
}

export interface IIpamBlockResponse {
  name: string;
  cidr: string;
  size: number;
  used: number;
  vnets?: IIpamVNetResponse[];
}

export interface IIpamVNetResponse {
  name: string;
  id: string;
  prefixes: string[];
  resource_group: string;
  subscription_id: string;
  size: number;
  used: number;
  subnets?: IIpamSubnetResponse[];
}

export interface IIpamSubnetResponse {
  name: string;
  prefix: string;
  size: number;
  used: number;
}

// Display interfaces
export interface ISubnet {
  name: string;
  prefix: string;
  size: number;
  used: number;
  vnetName?: string;
  blockName?: string;
  spaceName?: string;
}

export interface IVNet {
  name: string;
  id: string;
  subscription_id: string;
  resource_group: string;
  prefixes: string[];
  subnets: ISubnet[];
  size: number;
  used: number;
  blockName?: string;
  spaceName?: string;
}

export interface IIpamSummary {
  spacesConfigured: boolean;
  totalSpaces: number;
  totalBlocks: number;
  totalVnets: number;
  totalSubnets: number;
  totalIPs: number;
  usedIPs: number;
  utilisationPct: number;
  topUtilisedSubnets: ISubnet[];
  vnets: IVNet[];
}

export class IpamService {
  private client: AadHttpClient;
  private baseUrl: string = 'https://lbripam-g6jyrscvaao6k.azurewebsites.net';

  constructor(client: AadHttpClient) {
    this.client = client;
  }

  // Get spaces with blocks (names only, no utilisation data)
  public async getSpacesExpanded(): Promise<IIpamSpaceResponse[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/spaces?expand=true`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return response.json();
  }

  // Get a single block with full utilisation data at every level
  public async getBlockDetail(spaceName: string, blockName: string): Promise<IIpamBlockResponse> {
    const url = `${this.baseUrl}/api/spaces/${encodeURIComponent(spaceName)}/blocks/${encodeURIComponent(blockName)}?expand=true&utilization=true`;
    const response = await this.client.get(url, AadHttpClient.configurations.v1);
    if (!response.ok) throw new Error(`IPAM block API error: ${response.status}`);
    return response.json();
  }

  public async getSummary(): Promise<IIpamSummary> {
    // Get all spaces with blocks listed
    const spaces = await this.getSpacesExpanded();

    // If no spaces configured, return early
    if (!spaces || spaces.length === 0) {
      return {
        spacesConfigured: false,
        totalSpaces: 0,
        totalBlocks: 0,
        totalVnets: 0,
        totalSubnets: 0,
        totalIPs: 0,
        usedIPs: 0,
        utilisationPct: 0,
        topUtilisedSubnets: [],
        vnets: []
      };
    }

    // Fetch each block with utilisation data in parallel
    const blockRequests: { spaceName: string; blockName: string }[] = [];
    for (const space of spaces) {
      for (const block of (space.blocks || [])) {
        blockRequests.push({ spaceName: space.name, blockName: block.name });
      }
    }

    const blockDetails = await Promise.all(
      blockRequests.map(req => this.getBlockDetail(req.spaceName, req.blockName))
    );

    // Collect all VNets and subnets from the block details
    const allVnets: IVNet[] = [];
    const allSubnets: ISubnet[] = [];
    let totalSubnetSize = 0;
    let totalSubnetUsed = 0;

    blockRequests.forEach((req, i) => {
      const block = blockDetails[i];
      const vnets = block.vnets || [];

      for (const vnetData of vnets) {
        const subnets: ISubnet[] = [];
        let vnetSubnetSize = 0;
        let vnetSubnetUsed = 0;

        // Process subnets - this is where real utilisation lives
        if (vnetData.subnets && Array.isArray(vnetData.subnets)) {
          for (const subnet of vnetData.subnets) {
            const subnetSize = subnet.size || 0;
            const subnetUsed = subnet.used || 0;
            vnetSubnetSize += subnetSize;
            vnetSubnetUsed += subnetUsed;

            const subnetItem: ISubnet = {
              name: subnet.name,
              prefix: subnet.prefix,
              size: subnetSize,
              used: subnetUsed,
              vnetName: vnetData.name,
              blockName: req.blockName,
              spaceName: req.spaceName
            };
            subnets.push(subnetItem);
            allSubnets.push(subnetItem);
          }
        }

        totalSubnetSize += vnetSubnetSize;
        totalSubnetUsed += vnetSubnetUsed;

        // VNet utilisation derived from its subnets
        allVnets.push({
          name: vnetData.name,
          id: vnetData.id,
          subscription_id: vnetData.subscription_id,
          resource_group: vnetData.resource_group,
          prefixes: vnetData.prefixes || [],
          size: vnetSubnetSize,
          used: vnetSubnetUsed,
          subnets,
          blockName: req.blockName,
          spaceName: req.spaceName
        });
      }
    });

    // Sort subnets by utilisation descending (most used first)
    const subnetsByUtilisation = allSubnets
      .map(subnet => ({
        ...subnet,
        utilisation: subnet.size > 0 ? (subnet.used / subnet.size) * 100 : 0
      }))
      .sort((a, b) => b.utilisation - a.utilisation);

    // Top 5 most utilised subnets
    const topUtilisedSubnets = subnetsByUtilisation.slice(0, 5);

    // Overall IP utilisation: total subnet.used / total subnet.size
    const utilisationPct = totalSubnetSize > 0
      ? Math.round((totalSubnetUsed / totalSubnetSize) * 100)
      : 0;

    return {
      spacesConfigured: true,
      totalSpaces: spaces.length,
      totalBlocks: blockRequests.length,
      totalVnets: allVnets.length,
      totalSubnets: allSubnets.length,
      totalIPs: totalSubnetSize,
      usedIPs: totalSubnetUsed,
      utilisationPct,
      topUtilisedSubnets,
      vnets: allVnets
    };
  }
}
