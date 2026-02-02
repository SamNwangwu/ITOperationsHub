import { MSGraphClientV3 } from '@microsoft/sp-http';
import { WebPartContext } from '@microsoft/sp-webpart-base';

export interface ILicenseManagementProps {
  graphClient: MSGraphClientV3;
  context: WebPartContext;
}
