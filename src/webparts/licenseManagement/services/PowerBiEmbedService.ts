import { AadHttpClient, AadHttpClientResponse } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IPowerBiConfig } from '../models/ILicenceData';

// Power BI REST API resource
const POWER_BI_RESOURCE = 'https://analysis.windows.net/powerbi/api';

interface IEmbedTokenResponse {
  token: string;
  tokenId: string;
  expiration: string;
}

interface IReportResponse {
  id: string;
  name: string;
  embedUrl: string;
  datasetId: string;
}

interface IVisualInfo {
  name: string;
  title: string;
  type: string;
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface IPageVisuals {
  pageName: string;
  visuals: IVisualInfo[];
}

/**
 * Service for embedding Power BI visuals in SPFx
 * Uses AAD token flow via SPFx AadHttpClient
 */
export class PowerBiEmbedService {
  private context: WebPartContext;
  private aadClient: AadHttpClient | null = null;

  constructor(context: WebPartContext) {
    this.context = context;
  }

  /**
   * Initialize the AAD HTTP client for Power BI API calls
   */
  private async getAadClient(): Promise<AadHttpClient> {
    if (!this.aadClient) {
      this.aadClient = await this.context.aadHttpClientFactory.getClient(POWER_BI_RESOURCE);
    }
    return this.aadClient;
  }

  /**
   * Get report details from Power BI API
   */
  public async getReport(workspaceId: string, reportId: string): Promise<IReportResponse> {
    const client = await this.getAadClient();
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}`;

    const response: AadHttpClientResponse = await client.get(
      url,
      AadHttpClient.configurations.v1
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get report: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Generate embed token for a report
   */
  public async getEmbedToken(workspaceId: string, reportId: string): Promise<IEmbedTokenResponse> {
    const client = await this.getAadClient();
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/GenerateToken`;

    const response: AadHttpClientResponse = await client.post(
      url,
      AadHttpClient.configurations.v1,
      {
        body: JSON.stringify({
          accessLevel: 'View',
          allowSaveAs: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to generate embed token: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Get pages in a report
   */
  public async getReportPages(workspaceId: string, reportId: string): Promise<string[]> {
    const client = await this.getAadClient();
    const url = `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/reports/${reportId}/pages`;

    const response: AadHttpClientResponse = await client.get(
      url,
      AadHttpClient.configurations.v1
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get report pages: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.value.map((p: { name: string; displayName: string }) => p.name);
  }

  /**
   * Get full embed configuration for a report
   */
  public async getEmbedConfig(workspaceId: string, reportId: string): Promise<IPowerBiConfig & { accessToken: string; embedUrl: string }> {
    const [report, tokenResponse] = await Promise.all([
      this.getReport(workspaceId, reportId),
      this.getEmbedToken(workspaceId, reportId)
    ]);

    return {
      workspaceId,
      reportId,
      embedUrl: report.embedUrl,
      accessToken: tokenResponse.token
    };
  }

  /**
   * Build embed configuration object for powerbi-client library
   * Use this with the PowerBI JS SDK's embed() method
   */
  public buildEmbedConfiguration(
    config: IPowerBiConfig & { accessToken: string; embedUrl: string },
    pageName?: string,
    visualName?: string
  ): object {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const embedConfig: any = {
      type: visualName ? 'visual' : 'report',
      tokenType: 1, // Embed token (vs AAD token = 0)
      accessToken: config.accessToken,
      embedUrl: config.embedUrl,
      id: config.reportId,
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false }
        },
        background: 1, // Transparent
        layoutType: 0 // Custom
      }
    };

    if (pageName) {
      embedConfig.pageName = pageName;
    }

    if (visualName) {
      embedConfig.visualName = visualName;
    }

    return embedConfig;
  }

  /**
   * Check if Power BI configuration is valid
   */
  public isConfigured(config: IPowerBiConfig | undefined): boolean {
    return !!(config?.workspaceId && config?.reportId);
  }
}

export default PowerBiEmbedService;
