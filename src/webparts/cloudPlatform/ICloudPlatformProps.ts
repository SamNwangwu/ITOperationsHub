import { SPHttpClient, AadHttpClient, AadHttpClientFactory, MSGraphClientV3 } from '@microsoft/sp-http';

export interface ICloudPlatformProps {
  platform: 'aws' | 'azure';
  spHttpClient: SPHttpClient;
  siteUrl: string;
  customStats?: string;
  aadHttpClient?: AadHttpClient;
  aadHttpClientFactory?: AadHttpClientFactory;
  graphClient?: MSGraphClientV3;
}
