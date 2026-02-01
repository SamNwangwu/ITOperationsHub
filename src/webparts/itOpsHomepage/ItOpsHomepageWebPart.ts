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
    title: 'Lebara IT Operations Hub',
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
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '<svg viewBox="0 0 96 96" width="26" height="26"><path fill="#0078D4" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="#0078D4" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#0078D4" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#azh)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="azh" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="#114A8B"/><stop offset="1" stop-color="#0669BC"/></linearGradient></defs></svg>' },
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '<svg viewBox="0 0 40 40" width="26" height="26"><rect fill="#232F3E" width="40" height="40" rx="6"/><text x="20" y="24" text-anchor="middle" fill="#FF9900" font-family="Arial,sans-serif" font-size="12" font-weight="bold">AWS</text></svg>' },
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
        icon: '<svg viewBox="0 0 40 40" width="40" height="40"><rect fill="#232F3E" width="40" height="40" rx="8"/><text x="20" y="24" text-anchor="middle" fill="#FF9900" font-family="Arial,sans-serif" font-size="12" font-weight="bold">AWS</text></svg>',
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
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '<svg viewBox="0 0 40 40" width="26" height="26"><rect fill="#232F3E" width="40" height="40" rx="6"/><text x="20" y="24" text-anchor="middle" fill="#FF9900" font-family="Arial,sans-serif" font-size="12" font-weight="bold">AWS</text></svg>' },
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '<svg viewBox="0 0 96 96" width="26" height="26"><path fill="#0078D4" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="#0078D4" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#0078D4" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#az)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="az" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="#114A8B"/><stop offset="1" stop-color="#0669BC"/></linearGradient></defs></svg>' },
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