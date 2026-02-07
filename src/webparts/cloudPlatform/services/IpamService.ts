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

  // Get spaces with full nested data (blocks and vnets)
  public async getSpacesExpanded(): Promise<IIpamSpaceResponse[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/spaces?expand=true`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    const data = await response.json();
    console.log('IPAM spaces response:', JSON.stringify(data, null, 2));
    return data;
  }

  public async getSummary(): Promise<IIpamSummary> {
    // Get all spaces with expanded blocks and vnets
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

    // Collect all VNets and subnets from the nested structure
    const allVnets: IVNet[] = [];
    const allSubnets: ISubnet[] = [];
    let totalBlocks = 0;
    let totalIPs = 0;
    let usedIPs = 0;

    // Iterate through nested spaces -> blocks -> vnets
    for (const space of spaces) {
      const blocks = space.blocks || [];
      totalBlocks += blocks.length;

      for (const block of blocks) {
        const vnets = block.vnets || [];

        for (const vnetData of vnets) {
          // Map to display VNet
          const vnet: IVNet = {
            name: vnetData.name,
            id: vnetData.id,
            subscription_id: vnetData.subscription_id,
            resource_group: vnetData.resource_group,
            prefixes: vnetData.prefixes || [],
            size: vnetData.size || 0,
            used: vnetData.used || 0,
            subnets: [],
            blockName: block.name,
            spaceName: space.name
          };

          totalIPs += vnetData.size || 0;
          usedIPs += vnetData.used || 0;

          // Process subnets if available
          if (vnetData.subnets && Array.isArray(vnetData.subnets)) {
            for (const subnet of vnetData.subnets) {
              const subnetItem: ISubnet = {
                name: subnet.name,
                prefix: subnet.prefix,
                size: subnet.size || 0,
                used: subnet.used || 0,
                vnetName: vnetData.name,
                blockName: block.name,
                spaceName: space.name
              };
              vnet.subnets.push(subnetItem);
              allSubnets.push(subnetItem);
            }
          }

          allVnets.push(vnet);
        }
      }
    }

    // Sort subnets by utilisation for top utilised list
    const subnetsByUtilisation = allSubnets
      .map(subnet => ({
        ...subnet,
        utilisation: subnet.size > 0 ? (subnet.used / subnet.size) * 100 : 0
      }))
      .sort((a, b) => b.utilisation - a.utilisation);

    // Top 5 most utilised subnets
    const topUtilisedSubnets = subnetsByUtilisation.slice(0, 5);

    const utilisationPct = totalIPs > 0 ? Math.round((usedIPs / totalIPs) * 100) : 0;

    return {
      spacesConfigured: true,
      totalSpaces: spaces.length,
      totalBlocks,
      totalVnets: allVnets.length,
      totalSubnets: allSubnets.length,
      totalIPs,
      usedIPs,
      utilisationPct,
      topUtilisedSubnets,
      vnets: allVnets
    };
  }
}
