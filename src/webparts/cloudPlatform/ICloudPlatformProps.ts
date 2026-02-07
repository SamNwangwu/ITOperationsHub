import { SPHttpClient, AadHttpClient } from '@microsoft/sp-http';

export interface ICloudPlatformProps {
  platform: 'aws' | 'azure';
  spHttpClient: SPHttpClient;
  siteUrl: string;
  customStats?: string;
  aadHttpClient?: AadHttpClient;
}
