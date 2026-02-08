import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { AadHttpClient, MSGraphClientV3 } from '@microsoft/sp-http';
import CloudPlatform from './CloudPlatform';
import { ICloudPlatformProps } from './ICloudPlatformProps';

// IPAM Engine App ID for Azure IPAM API access
const IPAM_APP_ID = 'c74f5871-2191-4afe-8374-d29dec879c37';

export interface ICloudPlatformWebPartProps {
  platform: 'aws' | 'azure';
  customStats: string;
}

export default class CloudPlatformWebPart extends BaseClientSideWebPart<ICloudPlatformWebPartProps> {
  private aadHttpClient: AadHttpClient | undefined;
  private _graphClient: MSGraphClientV3;

  protected async onInit(): Promise<void> {
    try {
      this.aadHttpClient = await this.context.aadHttpClientFactory.getClient(IPAM_APP_ID);
    } catch (error) {
      console.warn('IPAM API client not available:', error);
    }
    try {
      this._graphClient = await this.context.msGraphClientFactory.getClient('3');
    } catch (error) {
      console.warn('Graph client not available:', error);
    }
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ICloudPlatformProps> = React.createElement(
      CloudPlatform,
      {
        platform: this.properties.platform || 'aws',
        spHttpClient: this.context.spHttpClient,
        siteUrl: this.context.pageContext.web.absoluteUrl,
        customStats: this.properties.customStats,
        aadHttpClient: this.aadHttpClient,
        aadHttpClientFactory: this.context.aadHttpClientFactory,
        graphClient: this._graphClient
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: 'Configure the Cloud Platform page'
          },
          groups: [
            {
              groupName: 'Platform Settings',
              groupFields: [
                PropertyPaneDropdown('platform', {
                  label: 'Cloud Platform',
                  options: [
                    { key: 'aws', text: 'AWS' },
                    { key: 'azure', text: 'Azure' }
                  ],
                  selectedKey: this.properties.platform || 'aws'
                })
              ]
            },
            {
              groupName: 'Custom Statistics (Optional)',
              groupFields: [
                PropertyPaneTextField('customStats', {
                  label: 'Custom Stats JSON',
                  description: 'Override default stats. Format: [{"label":"EC2 Instances","value":"200","icon":"🖥️"}]',
                  multiline: true,
                  rows: 6
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
