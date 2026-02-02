import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { MSGraphClientV3 } from '@microsoft/sp-http';
import LicenseManagement from './components/LicenseManagement';
import { ILicenseManagementProps } from './components/ILicenseManagementProps';

export default class LicenseManagementWebPart extends BaseClientSideWebPart<{}> {

  private _graphClient: MSGraphClientV3;

  protected async onInit(): Promise<void> {
    this._graphClient = await this.context.msGraphClientFactory.getClient('3');
    return super.onInit();
  }

  public render(): void {
    const element: React.ReactElement<ILicenseManagementProps> = React.createElement(
      LicenseManagement,
      {
        graphClient: this._graphClient,
        context: this.context
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
}
