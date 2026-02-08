import { WebPartContext } from '@microsoft/sp-webpart-base';
import { IReadonlyTheme } from '@microsoft/sp-component-base';
import { MSGraphClientV3 } from '@microsoft/sp-http';

export interface IPlatformCard {
  title: string;
  description: string;
  url: string;
  icon: string;
  colour: string;
  backgroundColour: string;
}

export interface IQuickLink {
  title: string;
  url: string;
  icon: string;
}

export interface IArchitectureDiagram {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl?: string;
}

export interface IItOpsHomepageProps {
  siteType: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackground: string;
  heroImage?: string;
  showStatusBadge: boolean;
  statusApiUrl?: string;
  showArchitectureDiagrams: boolean;
  diagramsLibraryUrl?: string;
  platformCards: IPlatformCard[];
  quickLinks: IQuickLink[];
  context: WebPartContext;
  graphClient?: MSGraphClientV3;
  themeVariant?: IReadonlyTheme;
}

export interface IItOpsHomepageState {
  systemStatus: 'healthy' | 'degraded' | 'down' | 'loading';
  diagrams: IArchitectureDiagram[];
  isLoading: boolean;
}
