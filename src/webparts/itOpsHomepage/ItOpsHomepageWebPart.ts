import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  PropertyPaneToggle,
  IPropertyPaneDropdownOption
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

// Site-specific configurations
const SITE_CONFIGS: { [key: string]: { 
  title: string; 
  subtitle: string; 
  background: string;
  platformCards: IPlatformCard[];
  quickLinks: IQuickLink[];
}} = {
  'Hub': {
    title: 'IT Operations Hub',
    subtitle: 'Central hub for IT Operations documentation and resources',
    background: '#00289e',
    platformCards: [
      {
        title: 'Infrastructure',
        description: 'AWS, Azure, servers & certificates',
        url: '/sites/Infrastructure',
        icon: '🖥️',
        colour: '#ffffff',
        backgroundColour: '#0047ab'
      },
      {
        title: 'Identity & Access',
        description: 'Licenses, JML, access management',
        url: '/sites/ITOps-IAM',
        icon: '🔐',
        colour: '#ffffff',
        backgroundColour: '#00289e'
      },
      {
        title: 'Platform Engineering',
        description: 'Architecture decisions, Terraform modules',
        url: '/sites/ITOps-Platform',
        icon: '⚙️',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      },
      {
        title: 'Service Management',
        description: 'Runbooks, escalation, knowledge base',
        url: '/sites/ITOps-ServiceMgmt',
        icon: '📋',
        colour: '#ffffff',
        backgroundColour: '#003366'
      }
    ],
    quickLinks: [
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'Service Desk', url: 'https://lebara.service-now.com', icon: '🎫' },
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '🔷' },
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️' },
      { title: 'Runbooks', url: '/sites/ITOps-ServiceMgmt/Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: '/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '📞' }
    ]
  },
  'Infrastructure': {
    title: 'Infrastructure Services',
    subtitle: 'Cloud platforms, networking, and core systems',
    background: '#00289e',
    platformCards: [
      {
        title: 'AWS',
        description: 'London & Ireland regions',
        url: 'SitePages/AWS-Overview.aspx',
        icon: '<svg viewBox="0 0 64 64" width="40" height="40"><path fill="#F90" d="M18.9 36.2c0 1 .1 1.8.4 2.4.2.6.6 1.2 1 1.9.2.3.2.5.2.7 0 .3-.2.6-.6.9l-2 1.3c-.3.2-.6.3-.8.3-.3 0-.6-.2-.9-.5-.4-.5-.8-1-1.1-1.5-.3-.6-.6-1.2-1-2-2.4 2.9-5.5 4.3-9.2 4.3-2.6 0-4.7-.7-6.2-2.2-1.5-1.5-2.3-3.5-2.3-6 0-2.6.9-4.8 2.8-6.4 1.9-1.6 4.4-2.4 7.5-2.4 1 0 2.1.1 3.3.2 1.1.2 2.3.4 3.5.6v-2.3c0-2.4-.5-4-1.5-5-1-.9-2.7-1.4-5.2-1.4-1.1 0-2.3.1-3.4.4-1.2.3-2.3.6-3.4 1-.5.2-.9.4-1.1.4-.2.1-.4.1-.5.1-.5 0-.7-.3-.7-1v-1.6c0-.5.1-.9.2-1.1.2-.2.5-.4 1-.6 1.1-.6 2.5-1 4-1.4 1.5-.4 3.2-.5 5-.5 3.8 0 6.6.9 8.4 2.6 1.7 1.7 2.6 4.4 2.6 7.9v10.4zm-12.7 4.8c1 0 2.1-.2 3.2-.6 1.1-.4 2.1-1.1 2.9-2 .5-.6.9-1.3 1.1-2.1.2-.8.3-1.8.3-3v-1.4c-.9-.2-1.8-.4-2.8-.5-1-.1-1.9-.2-2.8-.2-2.1 0-3.6.4-4.6 1.2-1 .8-1.5 2-1.5 3.5 0 1.4.4 2.5 1.1 3.2.7.6 1.8 1 3.1.9zm25.2 3.4c-.6 0-1.1-.1-1.3-.3-.3-.2-.5-.6-.7-1.2L22.5 21c-.2-.6-.3-1.1-.3-1.3 0-.5.3-.8.8-.8h3.1c.7 0 1.1.1 1.4.3.2.2.5.6.6 1.2l5 19.7 4.7-19.7c.2-.6.4-1 .6-1.2.3-.2.8-.3 1.4-.3h2.5c.7 0 1.1.1 1.4.3.2.2.5.6.6 1.2l4.7 20 5.2-20c.2-.6.4-1 .7-1.2.2-.2.7-.3 1.3-.3h2.9c.5 0 .9.3.9.8 0 .2 0 .3-.1.5 0 .2-.1.5-.3.8l-7.1 21.8c-.2.6-.4 1-.7 1.2-.2.2-.7.3-1.3.3h-2.7c-.7 0-1.1-.1-1.4-.3-.2-.2-.5-.6-.6-1.3l-4.6-19.3-4.6 19.2c-.2.6-.4 1-.6 1.3-.3.2-.8.3-1.4.3h-2.7zm40.3 1c-1.6 0-3.2-.2-4.7-.6-1.5-.4-2.6-.8-3.4-1.3-.5-.3-.8-.6-.9-.9-.1-.3-.2-.6-.2-.9v-1.7c0-.7.3-1 .8-1 .2 0 .4 0 .6.1.2.1.5.2.8.3 1.1.5 2.3.9 3.6 1.2 1.3.3 2.5.4 3.8.4 2 0 3.6-.4 4.7-1.1 1.1-.7 1.6-1.8 1.6-3.2 0-.9-.3-1.7-.9-2.3-.6-.6-1.7-1.2-3.3-1.7l-4.8-1.5c-2.4-.8-4.2-1.9-5.2-3.4-1.1-1.5-1.6-3.1-1.6-4.9 0-1.4.3-2.7.9-3.7.6-1.1 1.4-2 2.4-2.7 1-.7 2.1-1.3 3.4-1.7 1.3-.4 2.6-.5 4-.5.7 0 1.4 0 2.1.1.7.1 1.4.2 2 .4.6.2 1.2.3 1.8.5.5.2 1 .4 1.3.6.4.3.7.5.9.8.2.3.2.6.2 1.1v1.5c0 .7-.3 1-.8 1-.3 0-.7-.1-1.3-.4-2-1-4.2-1.4-6.7-1.4-1.8 0-3.3.3-4.3.9-1 .6-1.5 1.6-1.5 2.9 0 .9.3 1.7 1 2.4.7.6 1.9 1.2 3.6 1.8l4.7 1.5c2.4.8 4.1 1.8 5.1 3.2 1 1.3 1.5 2.9 1.5 4.6 0 1.5-.3 2.8-.9 3.9-.6 1.1-1.4 2.1-2.5 2.9-1 .8-2.3 1.4-3.7 1.8-1.5.5-3.1.7-4.8.7z"/><path fill="#F90" d="M64 50.3c-7.5 5.5-18.3 8.5-27.6 8.5-13.1 0-24.8-4.8-33.7-12.9-.7-.6-.1-1.5.8-1 9.6 5.6 21.5 8.9 33.8 8.9 8.3 0 17.4-1.7 25.8-5.3 1.3-.5 2.3.8.9 1.8z"/><path fill="#F90" d="M67 47c-1-.1-1.7.7-1.1 1.5 3.3 4 10.6 12.7 6.7 14.7-2.2 1.1-9.6-.8-13.8-1.6-1-.2-1.2.8-.3 1.4 2.4 1.8 6.9 5 11 5.8 4.2.8 12.2 1.3 12.9-2 .8-3.3-5.9-11.2-7.4-13.3-.5-.7-1-1.6-1.1-1.8-1-.1-4.4-2-6.9-4.7z"/></svg>',
        colour: '#FF9900',
        backgroundColour: '#232F3E'
      },
      {
        title: 'Azure',
        description: 'UK South & UK West regions',
        url: 'SitePages/Azure-Overview.aspx',
        icon: '<svg viewBox="0 0 96 96" width="40" height="40"><path fill="#0078D4" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="#0078D4" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#0078D4" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#a)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="a" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="#114A8B"/><stop offset="1" stop-color="#0669BC"/></linearGradient></defs></svg>',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      }
    ],
    quickLinks: [
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️' },
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '🔷' },
      { title: 'Runbooks', url: '/sites/ITOps-ServiceMgmt/Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: '/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '📞' },
      { title: 'Certificates', url: 'Lists/CertInventory', icon: '🔐' }
    ]
  },
  'IAM': {
    title: 'Identity & Access Management',
    subtitle: 'Licenses, joiners/movers/leavers, and access control',
    background: '#5C2D91',
    platformCards: [
      {
        title: 'License Management',
        description: 'M365, software licenses & costs',
        url: 'Lists/LicenseInventory',
        icon: '📄',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      },
      {
        title: 'JML Tracker',
        description: 'Joiners, movers & leavers',
        url: 'Lists/JMLTracker',
        icon: '👥',
        colour: '#ffffff',
        backgroundColour: '#5C2D91'
      },
      {
        title: 'Orphan Accounts',
        description: 'Disabled accounts for cleanup',
        url: 'Lists/OrphanAccounts',
        icon: '👻',
        colour: '#ffffff',
        backgroundColour: '#881798'
      },
      {
        title: 'Entra ID',
        description: 'Azure AD administration',
        url: 'https://entra.microsoft.com',
        icon: '🔐',
        colour: '#ffffff',
        backgroundColour: '#00A4EF'
      }
    ],
    quickLinks: [
      { title: 'Entra Admin', url: 'https://entra.microsoft.com', icon: '🔐' },
      { title: 'M365 Admin', url: 'https://admin.microsoft.com', icon: '📊' },
      { title: 'License Report', url: 'Lists/LicenseInventory', icon: '📄' },
      { title: 'JML Tracker', url: 'Lists/JMLTracker', icon: '👥' },
      { title: 'Cezanne HR', url: 'https://lebara.cezanneondemand.com', icon: '👤' },
      { title: 'Service Desk', url: 'https://lebara.service-now.com', icon: '🎫' }
    ]
  },
  'Platform': {
    title: 'Platform Engineering',
    subtitle: 'Architecture decisions, infrastructure as code, and standards',
    background: '#0078D4',
    platformCards: [
      {
        title: 'Architecture Decisions',
        description: 'ADRs and technical decisions',
        url: 'Lists/ArchitectureDecisionRecords',
        icon: '🏗️',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      },
      {
        title: 'Terraform Modules',
        description: 'Approved IaC modules',
        url: 'Lists/TerraformModules',
        icon: '📦',
        colour: '#ffffff',
        backgroundColour: '#5C4EE5'
      },
      {
        title: 'GitHub',
        description: 'Source code repositories',
        url: 'https://github.com/lebara',
        icon: '🐙',
        colour: '#ffffff',
        backgroundColour: '#24292e'
      },
      {
        title: 'Azure DevOps',
        description: 'Pipelines and boards',
        url: 'https://dev.azure.com/lebara',
        icon: '🚀',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      }
    ],
    quickLinks: [
      { title: 'GitHub', url: 'https://github.com/lebara', icon: '🐙' },
      { title: 'Azure DevOps', url: 'https://dev.azure.com/lebara', icon: '🚀' },
      { title: 'Terraform Registry', url: 'https://registry.terraform.io', icon: '📦' },
      { title: 'ADRs', url: 'Lists/ArchitectureDecisionRecords', icon: '🏗️' },
      { title: 'Documentation', url: 'Documents', icon: '📁' },
      { title: 'Standards', url: 'SitePages/Standards.aspx', icon: '📋' }
    ]
  },
  'ServiceMgmt': {
    title: 'Service Management',
    subtitle: 'Runbooks, escalation procedures, and knowledge base',
    background: '#107C10',
    platformCards: [
      {
        title: 'Runbooks',
        description: 'Operational procedures',
        url: 'Lists/Runbooks',
        icon: '📋',
        colour: '#ffffff',
        backgroundColour: '#107C10'
      },
      {
        title: 'Escalation Matrix',
        description: 'On-call contacts by service',
        url: 'Lists/EscalationMatrix',
        icon: '📞',
        colour: '#ffffff',
        backgroundColour: '#D83B01'
      },
      {
        title: 'Knowledge Base',
        description: 'Technical articles & solutions',
        url: 'Lists/KnowledgeBase',
        icon: '📚',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      },
      {
        title: 'Service Desk',
        description: 'ServiceNow portal',
        url: 'https://lebara.service-now.com',
        icon: '🎫',
        colour: '#ffffff',
        backgroundColour: '#81B5A1'
      }
    ],
    quickLinks: [
      { title: 'Service Desk', url: 'https://lebara.service-now.com', icon: '🎫' },
      { title: 'Runbooks', url: 'Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: 'Lists/EscalationMatrix', icon: '📞' },
      { title: 'Knowledge Base', url: 'Lists/KnowledgeBase', icon: '📚' },
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'PagerDuty', url: 'https://lebara.pagerduty.com', icon: '🚨' }
    ]
  }
};

export default class ItOpsHomepageWebPart extends BaseClientSideWebPart<IItOpsHomepageWebPartProps> {
  private _themeProvider: ThemeProvider;
  private _themeVariant: IReadonlyTheme | undefined;

  protected onInit(): Promise<void> {
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
    const siteType = this.properties.siteType || 'Infrastructure';
    const config = SITE_CONFIGS[siteType] || SITE_CONFIGS['Infrastructure'];

    // Use configured values or fall back to site type defaults
    const heroTitle = this.properties.heroTitle || config.title;
    const heroSubtitle = this.properties.heroSubtitle || config.subtitle;
    const heroBackground = this.properties.heroBackground || config.background;

    // Parse JSON configs or use defaults
    let platformCards: IPlatformCard[] = config.platformCards;
    let quickLinks: IQuickLink[] = config.quickLinks;

    try {
      if (this.properties.platformCardsJson && this.properties.platformCardsJson.trim() !== '') {
        platformCards = JSON.parse(this.properties.platformCardsJson);
      }
    } catch { /* use defaults */ }

    try {
      if (this.properties.quickLinksJson && this.properties.quickLinksJson.trim() !== '') {
        quickLinks = JSON.parse(this.properties.quickLinksJson);
      }
    } catch { /* use defaults */ }

    const element: React.ReactElement<IItOpsHomepageProps> = React.createElement(
      ItOpsHomepage,
      {
        siteType: siteType,
        heroTitle: heroTitle,
        heroSubtitle: heroSubtitle,
        heroBackground: heroBackground,
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

  // When site type changes, clear custom values so defaults apply
  protected onPropertyPaneFieldChanged(propertyPath: string, oldValue: string, newValue: string): void {
    if (propertyPath === 'siteType' && oldValue !== newValue) {
      const config = SITE_CONFIGS[newValue];
      if (config) {
        // Reset to defaults for new site type
        this.properties.heroTitle = '';
        this.properties.heroSubtitle = '';
        this.properties.heroBackground = '';
        this.properties.platformCardsJson = '';
        this.properties.quickLinksJson = '';
      }
    }
    super.onPropertyPaneFieldChanged(propertyPath, oldValue, newValue);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    const siteType = this.properties.siteType || 'Infrastructure';
    const config = SITE_CONFIGS[siteType] || SITE_CONFIGS['Infrastructure'];

    return {
      pages: [
        {
          header: { description: 'Configure the homepage appearance and content' },
          displayGroupsAsAccordion: true,
          groups: [
            {
              groupName: 'Site Configuration',
              isCollapsed: false,
              groupFields: [
                PropertyPaneDropdown('siteType', {
                  label: 'Site Type',
                  options: [
                    { key: 'Hub', text: 'IT Operations Hub' },
                    { key: 'Infrastructure', text: 'Infrastructure' },
                    { key: 'IAM', text: 'Identity & Access Management' },
                    { key: 'Platform', text: 'Platform Engineering' },
                    { key: 'ServiceMgmt', text: 'Service Management' }
                  ],
                  selectedKey: siteType
                })
              ]
            },
            {
              groupName: 'Hero Banner (Optional Overrides)',
              isCollapsed: true,
              groupFields: [
                PropertyPaneTextField('heroTitle', {
                  label: 'Title',
                  description: `Default: ${config.title}`,
                  placeholder: config.title
                }),
                PropertyPaneTextField('heroSubtitle', {
                  label: 'Subtitle',
                  description: `Default: ${config.subtitle}`,
                  placeholder: config.subtitle
                }),
                PropertyPaneTextField('heroBackground', {
                  label: 'Background Colour',
                  description: `Default: ${config.background}`,
                  placeholder: config.background
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
              isCollapsed: true,
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
              groupName: 'Advanced: Custom Cards (JSON)',
              isCollapsed: true,
              groupFields: [
                PropertyPaneTextField('platformCardsJson', {
                  label: 'Platform Cards Override',
                  description: 'Leave empty to use defaults. JSON array format.',
                  multiline: true,
                  rows: 6
                }),
                PropertyPaneTextField('quickLinksJson', {
                  label: 'Quick Links Override',
                  description: 'Leave empty to use defaults. JSON array format.',
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