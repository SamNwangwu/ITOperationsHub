import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  PropertyPaneToggle,
  PropertyPaneButton,
  PropertyPaneButtonType
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { ThemeProvider, ThemeChangedEventArgs, IReadonlyTheme } from '@microsoft/sp-component-base';

import ItOpsHomepage from './components/ItOpsHomepage';
import { IItOpsHomepageProps, IPlatformCard, IQuickLink } from './components/IItOpsHomepageProps';

export interface IItOpsHomepageWebPartProps {
  siteType: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBackground: string;
  heroImage: string;
  showStatusBadge: boolean;
  statusApiUrl: string;
  showArchitectureDiagrams: boolean;
  diagramsLibraryUrl: string;
  platformCardsJson: string;
  quickLinksJson: string;
}

export default class ItOpsHomepageWebPart extends BaseClientSideWebPart<IItOpsHomepageWebPartProps> {
  private _themeProvider: ThemeProvider;
  private _themeVariant: IReadonlyTheme | undefined;

  protected onInit(): Promise<void> {
    // Get theme
    this._themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
    this._themeVariant = this._themeProvider.tryGetTheme();
    this._themeProvider.themeChangedEvent.add(this, this._handleThemeChangedEvent);

    return super.onInit();
  }

  private _handleThemeChangedEvent(args: ThemeChangedEventArgs): void {
    this._themeVariant = args.theme;
    this.render();
  }

  public render(): void {
    // Parse JSON configs with defaults
    let platformCards: IPlatformCard[] = [];
    let quickLinks: IQuickLink[] = [];

    try {
      platformCards = this.properties.platformCardsJson 
        ? JSON.parse(this.properties.platformCardsJson) 
        : this._getDefaultPlatformCards();
    } catch { platformCards = this._getDefaultPlatformCards(); }

    try {
      quickLinks = this.properties.quickLinksJson 
        ? JSON.parse(this.properties.quickLinksJson) 
        : this._getDefaultQuickLinks();
    } catch { quickLinks = this._getDefaultQuickLinks(); }

    const element: React.ReactElement<IItOpsHomepageProps> = React.createElement(
      ItOpsHomepage,
      {
        siteType: this.properties.siteType || 'Infrastructure',
        heroTitle: this.properties.heroTitle || 'Infrastructure Services',
        heroSubtitle: this.properties.heroSubtitle || 'Cloud platforms, networking, and core systems',
        heroBackground: this.properties.heroBackground || '#00289e',
        heroImage: this.properties.heroImage,
        showStatusBadge: this.properties.showStatusBadge !== false,
        statusApiUrl: this.properties.statusApiUrl,
        showArchitectureDiagrams: this.properties.showArchitectureDiagrams !== false,
        diagramsLibraryUrl: this.properties.diagramsLibraryUrl,
        platformCards: platformCards,
        quickLinks: quickLinks,
        context: this.context,
        themeVariant: this._themeVariant
      }
    );

    ReactDom.render(element, this.domElement);
  }

  private _getDefaultPlatformCards(): IPlatformCard[] {
    const siteUrl = this.context.pageContext.web.absoluteUrl;
    return [
      {
        title: 'AWS',
        description: 'London & Ireland regions',
        url: `${siteUrl}/SitePages/AWS-Overview.aspx`,
        icon: '☁️',
        colour: '#FF9900',
        backgroundColour: '#232F3E'
      },
      {
        title: 'Azure',
        description: 'UK South & UK West regions',
        url: `${siteUrl}/SitePages/Azure-Overview.aspx`,
        icon: '🔷',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      }
    ];
  }

  private _getDefaultQuickLinks(): IQuickLink[] {
    return [
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️' },
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '🔷' },
      { title: 'Runbooks', url: 'https://lebara.sharepoint.com/sites/ITOps-ServiceMgmt/Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: 'https://lebara.sharepoint.com/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '📞' },
      { title: 'Certificates', url: '/Lists/CertInventory', icon: '🔐' }
    ];
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
          header: { description: 'Configure the homepage appearance and content' },
          displayGroupsAsAccordion: true,
          groups: [
            {
              groupName: 'Site Configuration',
              groupFields: [
                PropertyPaneDropdown('siteType', {
                  label: 'Site Type',
                  options: [
                    { key: 'Infrastructure', text: 'Infrastructure' },
                    { key: 'IAM', text: 'Identity & Access Management' },
                    { key: 'Platform', text: 'Platform Engineering' },
                    { key: 'ServiceMgmt', text: 'Service Management' },
                    { key: 'Hub', text: 'IT Operations Hub' }
                  ],
                  selectedKey: this.properties.siteType || 'Infrastructure'
                })
              ]
            },
            {
              groupName: 'Hero Banner',
              groupFields: [
                PropertyPaneTextField('heroTitle', {
                  label: 'Title',
                  description: 'Main heading text'
                }),
                PropertyPaneTextField('heroSubtitle', {
                  label: 'Subtitle',
                  description: 'Secondary text below title'
                }),
                PropertyPaneTextField('heroBackground', {
                  label: 'Background Colour',
                  description: 'Hex colour code (e.g., #00289e)'
                }),
                PropertyPaneTextField('heroImage', {
                  label: 'Background Image URL',
                  description: 'Optional image URL for background'
                }),
                PropertyPaneToggle('showStatusBadge', {
                  label: 'Show Status Badge',
                  onText: 'Yes',
                  offText: 'No'
                })
              ]
            },
            {
              groupName: 'Content Sections',
              groupFields: [
                PropertyPaneToggle('showArchitectureDiagrams', {
                  label: 'Show Architecture Diagrams',
                  onText: 'Yes',
                  offText: 'No'
                }),
                PropertyPaneTextField('diagramsLibraryUrl', {
                  label: 'Diagrams Library URL',
                  description: 'Document library containing diagram images'
                })
              ]
            },
            {
              groupName: 'Platform Cards (JSON)',
              groupFields: [
                PropertyPaneTextField('platformCardsJson', {
                  label: 'Platform Cards Configuration',
                  description: 'JSON array of platform card objects',
                  multiline: true,
                  rows: 10
                })
              ]
            },
            {
              groupName: 'Quick Links (JSON)',
              groupFields: [
                PropertyPaneTextField('quickLinksJson', {
                  label: 'Quick Links Configuration',
                  description: 'JSON array of quick link objects',
                  multiline: true,
                  rows: 10
                })
              ]
            },
            {
              groupName: 'Integration',
              groupFields: [
                PropertyPaneTextField('statusApiUrl', {
                  label: 'Status API URL',
                  description: 'Optional: New Relic or status API endpoint'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
