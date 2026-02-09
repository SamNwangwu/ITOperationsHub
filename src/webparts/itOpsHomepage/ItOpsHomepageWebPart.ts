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
import { MSGraphClientV3 } from '@microsoft/sp-http';

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
        description: 'AWS, Azure, certificates & cloud platforms',
        url: '/sites/InfrastructureV2',
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
      },
      {
        title: 'Security Operations',
        description: 'Threat management, compliance & posture',
        url: '/sites/ITOps-Security',
        icon: '\uD83D\uDEE1\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#0F4C5C'
      }
    ],
    quickLinks: [
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'FixIt (Service Desk)', url: 'https://fixit.lebara.com/app/lebara/HomePage.do', icon: '🎫' },
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
        url: 'InfrastructureV2/SitePages/AWS.aspx',
        icon: '<svg viewBox="0 0 40 40" width="40" height="40"><rect fill="#232F3E" width="40" height="40" rx="8"/><text x="20" y="24" text-anchor="middle" fill="#FF9900" font-family="Arial,sans-serif" font-size="12" font-weight="bold">AWS</text></svg>',
        colour: '#FF9900',
        backgroundColour: '#232F3E'
      },
      {
        title: 'Azure',
        description: 'UK South & UK West regions',
        url: 'InfrastructureV2/SitePages/Azure.aspx',
        icon: '<svg viewBox="0 0 96 96" width="40" height="40"><path fill="#0078D4" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="#0078D4" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#0078D4" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#a)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="a" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="#114A8B"/><stop offset="1" stop-color="#0669BC"/></linearGradient></defs></svg>',
        colour: '#ffffff',
        backgroundColour: '#0078D4'
      },
      {
        title: 'Network Operations (NOC)',
        description: 'Monitoring, patching, availability & incident response',
        url: '/sites/InfrastructureV2/SitePages/NOC.aspx',
        icon: '\uD83D\uDCE1',
        colour: '#ffffff',
        backgroundColour: '#003366'
      },
      {
        title: 'Network Infrastructure',
        description: 'VPN, ExpressRoute, RADIUS, DNS & connectivity',
        url: '/sites/InfrastructureV2/SitePages/NetworkInfra.aspx',
        icon: '\uD83C\uDF10',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      }
    ],
    quickLinks: [
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '<svg viewBox="0 0 40 40" width="26" height="26"><rect fill="#232F3E" width="40" height="40" rx="6"/><text x="20" y="24" text-anchor="middle" fill="#FF9900" font-family="Arial,sans-serif" font-size="12" font-weight="bold">AWS</text></svg>' },
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '<svg viewBox="0 0 96 96" width="26" height="26"><path fill="#0078D4" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="#0078D4" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#0078D4" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#az)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="az" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="#114A8B"/><stop offset="1" stop-color="#0669BC"/></linearGradient></defs></svg>' },
      { title: 'Runbooks', url: '/sites/ITOps-ServiceMgmt/Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: '/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '📞' },
      { title: 'Certificates', url: 'Lists/CertInventory', icon: '🔐' },
      { title: 'Azure Monitor', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Monitoring', icon: '\uD83D\uDCCA' },
      { title: 'Patch Schedule', url: 'SitePages/PatchSchedule.aspx', icon: '\uD83D\uDD27' }
    ]
  },
  'IAM': {
    title: 'Identity & Access Management',
    subtitle: 'Licenses, joiners/movers/leavers, and access control',
    background: '#5C2D91',
    platformCards: [
      {
        title: 'Licence Intelligence',
        description: 'M365 licence analytics, optimisation & cost savings',
        url: 'https://lebara.sharepoint.com/sites/ITOps-IAM/SitePages/Licence-Management.aspx',
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
      { title: 'Licence Intelligence', url: 'https://lebara.sharepoint.com/sites/ITOps-IAM/SitePages/Licence-Management.aspx', icon: '📄' },
      { title: 'JML Tracker', url: 'Lists/JMLTracker', icon: '👥' },
      { title: 'Cezanne HR', url: 'https://lebara.cezanneondemand.com', icon: '👤' },
      { title: 'FixIt (Service Desk)', url: 'https://fixit.lebara.com/app/lebara/HomePage.do', icon: '🎫' }
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
      { title: 'Azure DevOps', url: 'https://lebara.visualstudio.com/Platform%20Engineering', icon: '🚀' },
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
        title: 'FixIt (Service Desk)',
        description: 'ManageEngine FixIt portal',
        url: 'https://fixit.lebara.com/app/lebara/HomePage.do',
        icon: '🎫',
        colour: '#ffffff',
        backgroundColour: '#81B5A1'
      }
    ],
    quickLinks: [
      { title: 'FixIt (Service Desk)', url: 'https://fixit.lebara.com/app/lebara/HomePage.do', icon: '🎫' },
      { title: 'Runbooks', url: 'Lists/Runbooks', icon: '📋' },
      { title: 'Escalation', url: 'Lists/EscalationMatrix', icon: '📞' },
      { title: 'Knowledge Base', url: 'Lists/KnowledgeBase', icon: '📚' },
      { title: 'New Relic', url: 'https://one.newrelic.com', icon: '📊' },
      { title: 'PagerDuty', url: 'https://lebara.pagerduty.com', icon: '🚨' }
    ]
  },
  'Security': {
    title: 'Security Operations',
    subtitle: 'Threat management, compliance, and security posture',
    background: '#0F4C5C',
    platformCards: [
      {
        title: 'Vulnerability Management',
        description: 'Rapid7 scan coverage, aging vulnerabilities, remediation SLAs',
        url: 'SitePages/VulnerabilityManagement.aspx',
        icon: '\uD83D\uDEE1\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#0A3A47'
      },
      {
        title: 'Cloud Security Posture',
        description: 'Wiz findings, misconfigurations, compliance frameworks',
        url: 'SitePages/CloudSecurityPosture.aspx',
        icon: '\u2601\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#0F4C5C'
      },
      {
        title: 'Data Security & DLP',
        description: 'Varonis alerts, sensitive data exposure, Purview DLP policies',
        url: 'SitePages/DataSecurity.aspx',
        icon: '\uD83D\uDD12',
        colour: '#ffffff',
        backgroundColour: '#0D3D4A'
      },
      {
        title: 'Privileged Access (PAM)',
        description: 'CyberArk sessions, password rotation, vault onboarding',
        url: 'SitePages/PrivilegedAccess.aspx',
        icon: '\uD83D\uDD10',
        colour: '#ffffff',
        backgroundColour: '#0A3440'
      },
      {
        title: 'SIEM & Threat Detection',
        description: 'Sentinel alerts, MTTR, incident trends, false positive rates',
        url: 'SitePages/SIEMThreatDetection.aspx',
        icon: '\uD83D\uDEA8',
        colour: '#ffffff',
        backgroundColour: '#083038'
      },
      {
        title: 'Security Awareness',
        description: 'KnowBe4 training completion, phishing simulation results',
        url: 'SitePages/SecurityAwareness.aspx',
        icon: '\uD83C\uDF93',
        colour: '#ffffff',
        backgroundColour: '#0F4C5C'
      }
    ],
    quickLinks: [
      { title: 'Rapid7 Console', url: 'https://insight.rapid7.com', icon: '\uD83D\uDEE1\uFE0F' },
      { title: 'Wiz Portal', url: 'https://app.wiz.io', icon: '\u2601\uFE0F' },
      { title: 'Microsoft Sentinel', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Security_Insights', icon: '\uD83D\uDD0D' },
      { title: 'CyberArk', url: 'https://cyberark.lebara.com', icon: '\uD83D\uDD10' },
      { title: 'Purview Compliance', url: 'https://compliance.microsoft.com', icon: '\uD83D\uDCCB' },
      { title: 'KnowBe4', url: 'https://training.knowbe4.com', icon: '\uD83C\uDF93' }
    ]
  },
  'NOC': {
    title: 'Network Operations Centre',
    subtitle: 'Monitoring, patching, availability, and incident response',
    background: '#003366',
    platformCards: [
      {
        title: 'Monitoring & Alerting',
        description: 'NewRelic dashboards, uptime SLAs, alert noise ratio, MTTA/MTTR',
        url: 'SitePages/MonitoringAlerting.aspx',
        icon: '\uD83D\uDCE1',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'Patch Management',
        description: 'Server patch compliance, upcoming windows, OS version distribution',
        url: 'SitePages/PatchManagement.aspx',
        icon: '\uD83D\uDD27',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'Incident Management',
        description: 'P1/P2 incidents, escalation stats, RCA completion rates',
        url: 'SitePages/IncidentManagement.aspx',
        icon: '\uD83D\uDEA8',
        colour: '#ffffff',
        backgroundColour: '#003366'
      },
      {
        title: 'Availability & SLAs',
        description: 'Uptime by service/environment, planned vs unplanned downtime',
        url: 'SitePages/AvailabilitySLAs.aspx',
        icon: '\u2705',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'Capacity Monitoring',
        description: 'CPU/memory/disk trends, threshold breaches, forecasting',
        url: 'SitePages/CapacityMonitoring.aspx',
        icon: '\uD83D\uDCCA',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'Change Management',
        description: 'Scheduled maintenance, change success rate, emergency changes',
        url: 'SitePages/ChangeManagement.aspx',
        icon: '\uD83D\uDCC5',
        colour: '#ffffff',
        backgroundColour: '#003366'
      }
    ],
    quickLinks: [
      { title: 'NewRelic', url: 'https://one.newrelic.com', icon: '\uD83D\uDCCA' },
      { title: 'ManageEngine FixIt', url: 'https://fixit.lebara.com', icon: '\uD83C\uDFAB' },
      { title: 'Azure Monitor', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Monitoring', icon: '\uD83D\uDD0D' },
      { title: 'Patch Schedule', url: 'SitePages/PatchSchedule.aspx', icon: '\uD83D\uDCC5' },
      { title: 'Escalation Matrix', url: '/sites/ITOps-ServiceMgmt/Lists/EscalationMatrix', icon: '\uD83D\uDCDE' },
      { title: 'On-Call Rota', url: 'SitePages/OnCallRota.aspx', icon: '\uD83D\uDC64' }
    ]
  },
  'NetworkInfra': {
    title: 'Network Infrastructure & Connectivity',
    subtitle: 'VPN, ExpressRoute, RADIUS, DNS, and network services',
    background: '#001a4d',
    platformCards: [
      {
        title: 'IPAM & Subnet Management',
        description: 'VNet utilisation, IP allocation, subnet capacity',
        url: '/sites/Infrastructure/SitePages/IPAM.aspx',
        icon: '\uD83C\uDF10',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'ExpressRoute & WAN',
        description: 'Circuit health, bandwidth utilisation, peering status',
        url: 'SitePages/ExpressRoute.aspx',
        icon: '\u26A1',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      },
      {
        title: 'VPN Services',
        description: 'Site-to-site tunnels, client VPN usage, split tunnel policies',
        url: 'SitePages/VPNServices.aspx',
        icon: '\uD83D\uDD12',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      },
      {
        title: 'RADIUS & NAC',
        description: 'Authentication success/failure rates, device compliance, 802.1X',
        url: 'SitePages/RadiusNAC.aspx',
        icon: '\uD83D\uDD11',
        colour: '#ffffff',
        backgroundColour: '#0D2137'
      },
      {
        title: 'DNS & DHCP',
        description: 'Scope utilisation, query volumes, zone health',
        url: 'SitePages/DnsDhcp.aspx',
        icon: '\uD83D\uDDA5\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#001a4d'
      },
      {
        title: 'Firewall & Network Security',
        description: 'Rule reviews, ACL changes, policy compliance',
        url: 'SitePages/FirewallManagement.aspx',
        icon: '\uD83D\uDEE1\uFE0F',
        colour: '#ffffff',
        backgroundColour: '#1B3A5C'
      }
    ],
    quickLinks: [
      { title: 'Azure IPAM', url: 'https://ipam.lebara.com', icon: '\uD83C\uDF10' },
      { title: 'Network Watcher', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Network', icon: '\uD83D\uDD0D' },
      { title: 'ExpressRoute', url: 'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Network%2FexpressRouteCircuits', icon: '\u26A1' },
      { title: 'VPN Gateway', url: 'https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Network%2FvirtualNetworkGateways', icon: '\uD83D\uDD12' },
      { title: 'Firewall Manager', url: 'https://portal.azure.com/#blade/Microsoft_Azure_HybridNetworking/FirewallManagerMenuBlade', icon: '\uD83D\uDEE1\uFE0F' },
      { title: 'Circuit Vendor Portal', url: 'https://vendor.placeholder.com', icon: '\uD83D\uDCDE' }
    ]
  }
};

export default class ItOpsHomepageWebPart extends BaseClientSideWebPart<IItOpsHomepageWebPartProps> {
  private _themeProvider: ThemeProvider;
  private _themeVariant: IReadonlyTheme | undefined;
  private _graphClient: MSGraphClientV3;

  protected async onInit(): Promise<void> {
    this._themeProvider = this.context.serviceScope.consume(ThemeProvider.serviceKey);
    this._themeVariant = this._themeProvider.tryGetTheme();
    this._themeProvider.themeChangedEvent.add(this, this._handleThemeChangedEvent);

    try {
      this._graphClient = await this.context.msGraphClientFactory.getClient('3');
    } catch (error) {
      console.warn('Graph client not available:', error);
    }

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
        graphClient: this._graphClient,
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
                    { key: 'ServiceMgmt', text: 'Service Management' },
                    { key: 'Security', text: 'Security Operations' },
                    { key: 'NOC', text: 'Network Operations Centre' },
                    { key: 'NetworkInfra', text: 'Network Infrastructure' }
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