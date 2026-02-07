import { AadHttpClient } from '@microsoft/sp-http';

export interface ISubnet {
  name: string;
  prefix: string;
  size: number;
  used: number;
  vnetName?: string;
}

export interface IVNet {
  name: string;
  id: string;
  subscription_id: string;
  resource_group: string;
  address_space: string[];
  subnets: ISubnet[];
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
  topUtilisedSubnets: ISubnet[];
  leastUtilisedSubnets: ISubnet[];
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

  public async getSubnets(): Promise<ISubnet[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/azure/subnets`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getEndpoints(): Promise<any[]> {
    const response = await this.client.get(
      `${this.baseUrl}/api/azure/endpoints`,
      AadHttpClient.configurations.v1
    );
    if (!response.ok) throw new Error(`IPAM API error: ${response.status}`);
    return await response.json();
  }

  public async getSummary(): Promise<IIpamSummary> {
    // Fetch vnets and endpoints in parallel
    const [vnets, endpoints] = await Promise.all([
      this.getVnets(),
      this.getEndpoints()
    ]);

    // Calculate totals
    let totalIPs = 0;
    let usedIPs = 0;
    const allSubnets: ISubnet[] = [];

    for (const vnet of vnets) {
      totalIPs += vnet.size || 0;
      usedIPs += vnet.used || 0;

      if (vnet.subnets && Array.isArray(vnet.subnets)) {
        for (const subnet of vnet.subnets) {
          allSubnets.push({
            ...subnet,
            vnetName: vnet.name
          });
        }
      }
    }

    // Sort subnets by utilisation
    const subnetsByUtilisation = allSubnets
      .map(subnet => ({
        ...subnet,
        utilisation: subnet.size > 0 ? (subnet.used / subnet.size) * 100 : 0
      }))
      .sort((a, b) => b.utilisation - a.utilisation);

    // Top 5 most utilised
    const topUtilisedSubnets = subnetsByUtilisation.slice(0, 5);

    // Bottom 5 least utilised (with >0 usage)
    const leastUtilisedSubnets = subnetsByUtilisation
      .filter(s => s.used > 0)
      .slice(-5)
      .reverse();

    const utilisationPct = totalIPs > 0 ? Math.round((usedIPs / totalIPs) * 100) : 0;

    return {
      totalVnets: vnets.length,
      totalSubnets: allSubnets.length,
      totalEndpoints: endpoints.length,
      totalIPs,
      usedIPs,
      utilisationPct,
      topUtilisedSubnets,
      leastUtilisedSubnets,
      vnets
    };
  }
}
