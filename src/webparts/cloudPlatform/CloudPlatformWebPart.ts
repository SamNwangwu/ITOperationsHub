import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneDropdown,
  PropertyPaneTextField
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import CloudPlatform from './CloudPlatform';
import { ICloudPlatformProps } from './ICloudPlatformProps';

export interface ICloudPlatformWebPartProps {
  platform: 'aws' | 'azure';
  customStats: string;
}

export default class CloudPlatformWebPart extends BaseClientSideWebPart<ICloudPlatformWebPartProps> {

  public render(): void {
    const element: React.ReactElement<ICloudPlatformProps> = React.createElement(
      CloudPlatform,
      {
        platform: this.properties.platform || 'aws',
        spHttpClient: this.context.spHttpClient,
        siteUrl: this.context.pageContext.web.absoluteUrl,
        customStats: this.properties.customStats
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
