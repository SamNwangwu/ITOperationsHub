import { AadHttpClient } from '@microsoft/sp-http';

// IPAM API response interfaces
export interface IIpamSpace {
  name: string;
  desc: string;
  size: number;
  used: number;
}

export interface IIpamBlock {
  name: string;
  cidr: string;
  size: number;
  used: number;
}

export interface IIpamNetwork {
  name: string;
  id: string;
  cidr: string;
  subscription_id: string;
  resource_group: string;
  size: number;
  used: number;
  subnets?: IIpamSubnet[];
}

export interface IIpamSubnet {
  name: string;
  cidr: string;
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
  cidr: string;
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
  spaces: IIpamSpace[];
}

export class IpamService {
  private client: AadHttpClient;
  private baseUrl: string = 'https://lbripam-g6jyrscvaao6k.azurewebsites.net';

  constructor(client: AadHttpClient) {
    this.client = client;
  }

  public async getSpaces(): Promise<IIpamSpace[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/spaces`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getBlocks(spaceName: string): Promise<IIpamBlock[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/spaces/${encodeURIComponent(spaceName)}/blocks`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getNetworks(spaceName: string, blockName: string): Promise<IIpamNetwork[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/spaces/${encodeURIComponent(spaceName)}/blocks/${encodeURIComponent(blockName)}/networks`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getStatus(): Promise<{ status: string }> {
    const response = await this.client.get(
      `${this.baseUrl}/api/status`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getSummary(): Promise<IIpamSummary> {
    // First get all spaces
    const spaces = await this.getSpaces();

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
        vnets: [],
        spaces: []
      };
    }

    // Collect all VNets and subnets across all spaces and blocks
    const allVnets: IVNet[] = [];
    const allSubnets: ISubnet[] = [];
    let totalBlocks = 0;
    let totalIPs = 0;
    let usedIPs = 0;

    // Iterate through spaces and blocks
    for (const space of spaces) {
      try {
        const blocks = await this.getBlocks(space.name);
        totalBlocks += blocks.length;

        for (const block of blocks) {
          try {
            const networks = await this.getNetworks(space.name, block.name);

            for (const network of networks) {
              // Map network to VNet
              const vnet: IVNet = {
                name: network.name,
                id: network.id,
                subscription_id: network.subscription_id,
                resource_group: network.resource_group,
                cidr: network.cidr,
                size: network.size || 0,
                used: network.used || 0,
                subnets: [],
                blockName: block.name,
                spaceName: space.name
              };

              totalIPs += network.size || 0;
              usedIPs += network.used || 0;

              // Process subnets if available
              if (network.subnets && Array.isArray(network.subnets)) {
                for (const subnet of network.subnets) {
                  const subnetItem: ISubnet = {
                    name: subnet.name,
                    prefix: subnet.cidr,
                    size: subnet.size || 0,
                    used: subnet.used || 0,
                    vnetName: network.name,
                    blockName: block.name,
                    spaceName: space.name
                  };
                  vnet.subnets.push(subnetItem);
                  allSubnets.push(subnetItem);
                }
              }

              allVnets.push(vnet);
            }
          } catch (networkErr) {
            console.warn(`Failed to fetch networks for ${space.name}/${block.name}:`, networkErr);
          }
        }
      } catch (blockErr) {
        console.warn(`Failed to fetch blocks for space ${space.name}:`, blockErr);
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
      vnets: allVnets,
      spaces
    };
  }
}
