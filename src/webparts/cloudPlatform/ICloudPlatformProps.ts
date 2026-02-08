import { SPHttpClient, AadHttpClient, AadHttpClientFactory } from '@microsoft/sp-http';

export interface ICloudPlatformProps {
  platform: 'aws' | 'azure';
  spHttpClient: SPHttpClient;
  siteUrl: string;
  customStats?: string;
  aadHttpClient?: AadHttpClient;
  aadHttpClientFactory?: AadHttpClientFactory;
}
