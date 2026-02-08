import { SPHttpClient } from '@microsoft/sp-http';
import { MSGraphClientV3 } from '@microsoft/sp-http';

export interface IFeedbackButtonProps {
  spHttpClient: SPHttpClient;
  graphClient: MSGraphClientV3;
  siteUrl: string;
  currentPage: string;
  notificationEmail?: string;
}
