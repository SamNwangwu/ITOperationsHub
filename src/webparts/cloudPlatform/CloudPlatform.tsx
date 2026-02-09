import * as React from 'react';
import { useState, useEffect } from 'react';
import styles from './CloudPlatform.module.scss';
import { ICloudPlatformProps } from './ICloudPlatformProps';
import { SPHttpClient, SPHttpClientResponse, AadHttpClient, AadHttpClientFactory } from '@microsoft/sp-http';
import { NetworkingDashboard } from './components/NetworkingDashboard';
import { FeedbackButton } from '../../components/FeedbackButton/FeedbackButton';
import CertificateHeroBanner from './components/CertificateHeroBanner';

// Platform configurations
const PLATFORM_CONFIGS = {
  aws: {
    name: 'AWS',
    icon: '☁️',
    primaryColor: '#232F3E',
    accentColor: '#FF9900',
    gradient: 'linear-gradient(135deg, #232F3E 0%, #1a242f 50%, #FF9900 150%)',
    subtitle: 'London & Ireland regions • Production, Staging & Development environments',
    consoleUrl: 'https://console.aws.amazon.com',
    consoleName: 'AWS Console',
    sections: [
      { id: 'architecture', title: 'Architecture', icon: '🏗️', folder: 'AWS/Architecture' },
      { id: 'accounts', title: 'Accounts', icon: '🏢', folder: 'AWS/Accounts' },
      { id: 'cost', title: 'Cost Management', icon: '💰', folder: 'AWS/Cost-Management' },
      { id: 'compute', title: 'Compute', icon: '🖥️', folder: 'AWS/Compute' },
      { id: 'backup', title: 'Backup & DR', icon: '💾', folder: 'AWS/Backup-DR' },
      { id: 'security', title: 'Security', icon: '🔒', folder: 'AWS/Security' }
    ],
    quickLinks: [
      { title: 'AWS Console', url: 'https://console.aws.amazon.com', icon: '☁️' },
      { title: 'Cost Explorer', url: 'https://console.aws.amazon.com/cost-management', icon: '💰' },
      { title: 'CloudWatch', url: 'https://console.aws.amazon.com/cloudwatch', icon: '📈' },
      { title: 'Security Hub', url: 'https://console.aws.amazon.com/securityhub', icon: '🛡️' },
      { title: 'IAM Console', url: 'https://console.aws.amazon.com/iam', icon: '🔐' },
      { title: 'Systems Manager', url: 'https://console.aws.amazon.com/systems-manager', icon: '📋' }
    ],
    stats: [
      { label: 'AWS Accounts', value: '12', icon: '🏢' },
      { label: 'EC2 Instances', value: '186', icon: '🖥️' },
      { label: 'RDS Databases', value: '24', icon: '🗄️' },
      { label: 'S3 Buckets', value: '89', icon: '📦' }
    ]
  },
  azure: {
    name: 'Azure',
    icon: '<svg viewBox="0 0 96 96" width="40" height="40"><path fill="#fff" d="M33.3 6.8h26.5l-27 77.6c-.4 1.2-1.5 2-2.8 2H6.9c-1.6 0-2.9-1.3-2.9-2.9 0-.4.1-.8.2-1.1l24.3-73.6c.4-1.2 1.5-2 2.8-2z"/><path fill="rgba(255,255,255,0.8)" d="M71.2 60.1H29.9c-.7 0-1.1.8-.6 1.3l26.6 24.8c.5.5 1.2.8 1.9.8h23.7L71.2 60.1z"/><path fill="#fff" d="M33.3 6.8c-1.3 0-2.4.8-2.8 2L6.3 82.3c-.1.4-.2.7-.2 1.1 0 1.6 1.3 2.9 2.9 2.9h24.3c1.2-.1 2.2-.9 2.6-2l5.1-14.9 18.5 17.2c.5.4 1.2.7 1.8.7h23.6l-10.2-27h-29l17.8-53.5H33.3z"/><path fill="url(#azcp)" d="M62.7 8.8c-.4-1.2-1.5-2-2.8-2H33.7c1.3 0 2.4.8 2.8 2l24.3 73.6c.1.4.2.8.2 1.1 0 1.6-1.3 2.9-2.9 2.9h26.2c1.6 0 2.9-1.3 2.9-2.9 0-.4-.1-.8-.2-1.1L62.7 8.8z"/><defs><linearGradient id="azcp" x1="45.8" y1="11.3" x2="69" y2="86.4" gradientUnits="userSpaceOnUse"><stop stop-color="rgba(255,255,255,0.7)"/><stop offset="1" stop-color="rgba(255,255,255,0.9)"/></linearGradient></defs></svg>',
    primaryColor: '#0078D4',
    accentColor: '#00BCF2',
    gradient: 'linear-gradient(135deg, #0078D4 0%, #004578 50%, #00BCF2 150%)',
    subtitle: 'North Europe, West Europe & Sweden Central regions • AVD, D365, Corporate Infrastructure',
    consoleUrl: 'https://portal.azure.com',
    consoleName: 'Azure Portal',
    sections: [
      { id: 'architecture', title: 'Architecture', icon: '🏗️', folder: 'Azure/Architecture' },
      { id: 'cost', title: 'Cost Management', icon: '💰', folder: 'Azure/Cost-Management' },
      { id: 'avd', title: 'AVD (Virtual Desktop)', icon: '💻', folder: 'Azure/AVD' },
      { id: 'security', title: 'Security', icon: '🔒', folder: 'Azure/Security' },
      { id: 'certificates', title: 'Certificates', icon: '🔐', folder: 'Azure/Certificates' },
      { id: 'networking', title: 'Networking', icon: '🌐', folder: 'Azure/Networking' }
    ],
    quickLinks: [
      { title: 'Azure Portal', url: 'https://portal.azure.com', icon: '🔷' },
      { title: 'Entra Admin', url: 'https://entra.microsoft.com', icon: '🔐' },
      { title: 'M365 Admin', url: 'https://admin.microsoft.com', icon: '📊' },
      { title: 'Cost Management', url: 'https://portal.azure.com/#blade/Microsoft_Azure_CostManagement', icon: '💰' },
      { title: 'Security Center', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Security', icon: '🛡️' },
      { title: 'Azure Monitor', url: 'https://portal.azure.com/#blade/Microsoft_Azure_Monitoring', icon: '📋' },
      { title: 'IPAM Dashboard', url: 'https://lbripam-g6jyrscvaao6k.azurewebsites.net', icon: '🌐' }
    ],
    stats: [
      { label: 'Subscriptions', value: '8', icon: '🏢' },
      { label: 'Virtual Machines', value: '120', icon: '🖥️' },
      { label: 'AVD Session Hosts', value: '85', icon: '💻' },
      { label: 'Storage Accounts', value: '34', icon: '📦' }
    ]
  }
};

interface IAzureStats {
  subscriptions: number;
  virtualMachines: number;
  resourceGroups: number;
  storageAccounts: number;
}

const fetchAzureStats = async (aadHttpClientFactory: AadHttpClientFactory): Promise<IAzureStats> => {
  const client = await aadHttpClientFactory.getClient('https://management.azure.com');

  const defaultStats: IAzureStats = { subscriptions: 0, virtualMachines: 0, resourceGroups: 0, storageAccounts: 0 };

  try {
    // Get subscriptions
    const subsResponse = await client.get(
      'https://management.azure.com/subscriptions?api-version=2022-12-01',
      AadHttpClient.configurations.v1
    );
    const subsData = await subsResponse.json();
    const subscriptions = subsData.value?.length || 0;

    // Use Resource Graph for efficient counting
    const queryBody = {
      query: `
        Resources
        | where type in~ (
            'microsoft.compute/virtualmachines',
            'microsoft.storage/storageaccounts',
            'microsoft.desktopvirtualization/hostpools'
          )
        | summarize count() by type
      `
    };

    const graphResponse = await client.post(
      'https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2022-10-01',
      AadHttpClient.configurations.v1,
      {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryBody)
      }
    );
    const graphData = await graphResponse.json();

    let virtualMachines = 0;
    let storageAccounts = 0;
    let avdHostPools = 0;

    if (Array.isArray(graphData.data)) {
      // REST API returns data as array of objects: { type, count_ }
      for (const row of graphData.data) {
        const resourceType = (row.type || '').toLowerCase();
        const count = row.count_ || 0;
        if (resourceType.includes('virtualmachines')) virtualMachines = count;
        else if (resourceType.includes('storageaccounts')) storageAccounts = count;
        else if (resourceType.includes('hostpools')) avdHostPools = count;
      }
    }

    return { subscriptions, virtualMachines, resourceGroups: avdHostPools, storageAccounts };
  } catch (error) {
    console.error('Failed to fetch Azure stats:', error);
    return defaultStats;
  }
};

interface IDocument {
  name: string;
  url: string;
  modified: string;
  type: string;
}

interface ISectionDocs {
  [key: string]: IDocument[];
}

export const CloudPlatform: React.FC<ICloudPlatformProps> = (props) => {
  const { platform, spHttpClient, siteUrl, customStats, aadHttpClient } = props;
  const config = PLATFORM_CONFIGS[platform] || PLATFORM_CONFIGS.aws;

  const [activeSection, setActiveSection] = useState<string>(config.sections[0]?.id || 'architecture');
  const [documents, setDocuments] = useState<ISectionDocs>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [azureStats, setAzureStats] = useState<IAzureStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (platform === 'azure' && props.aadHttpClientFactory && !customStats) {
      setStatsLoading(true);
      fetchAzureStats(props.aadHttpClientFactory)
        .then((data) => {
          setAzureStats(data);
          setStatsLoading(false);
        })
        .catch(() => setStatsLoading(false));
    }
  }, [platform, props.aadHttpClientFactory]);

  // Parse custom stats if provided, or use live Azure data
  const stats = customStats
    ? (() => { try { return JSON.parse(customStats); } catch { return config.stats; } })()
    : (platform === 'azure' && azureStats)
      ? [
          { label: 'Subscriptions', value: String(azureStats.subscriptions), icon: '🏢' },
          { label: 'Virtual Machines', value: String(azureStats.virtualMachines), icon: '🖥️' },
          { label: 'AVD Host Pools', value: String(azureStats.resourceGroups), icon: '💻' },
          { label: 'Storage Accounts', value: String(azureStats.storageAccounts), icon: '📦' }
        ]
      : config.stats;

  // Fetch documents from SharePoint
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!spHttpClient || !siteUrl) {
        setLoading(false);
        return;
      }

      const docs: ISectionDocs = {};
      
      for (const section of config.sections) {
        try {
          const folderPath = `/sites/InfrastructureV2/Shared Documents/${section.folder}`;
          const apiUrl = `${siteUrl}/_api/web/GetFolderByServerRelativeUrl('${encodeURIComponent(folderPath)}')/Files?$select=Name,ServerRelativeUrl,TimeLastModified&$orderby=TimeLastModified desc&$top=10`;
          
          const response: SPHttpClientResponse = await spHttpClient.get(
            apiUrl,
            SPHttpClient.configurations.v1
          );
          
          if (response.ok) {
            const data = await response.json();
            docs[section.id] = (data.value || []).map((file: any) => ({
              name: file.Name,
              url: file.ServerRelativeUrl,
              modified: new Date(file.TimeLastModified).toLocaleDateString(),
              type: getFileType(file.Name)
            }));
          } else {
            docs[section.id] = [];
          }
        } catch (error) {
          console.error(`Error fetching docs for ${section.id}:`, error);
          docs[section.id] = [];
        }
      }
      
      setDocuments(docs);
      setLoading(false);
    };

    fetchDocuments();
  }, [spHttpClient, siteUrl, platform]);

  const getFileType = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return 'xlsx';
      case 'pdf':
        return 'pdf';
      case 'docx':
      case 'doc':
        return 'docx';
      case 'pptx':
      case 'ppt':
        return 'pptx';
      case 'ps1':
        return 'ps1';
      default:
        return 'default';
    }
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'xlsx': return '📊';
      case 'pdf': return '📄';
      case 'docx': return '📝';
      case 'pptx': return '📽️';
      case 'ps1': return '⚡';
      default: return '📁';
    }
  };

  const currentSection = config.sections.find(s => s.id === activeSection);
  const currentDocs = documents[activeSection] || [];

  return (
    <div className={styles.cloudPlatform} style={{ '--accent-color': config.accentColor, '--primary-color': config.primaryColor } as React.CSSProperties}>
      {/* Hero Section */}
      <section className={styles.hero} style={{ background: config.gradient }}>
        <div className={styles.heroContent}>
          <div className={styles.breadcrumb}>
            <a href="/sites/ITOpsHub">IT Operations Hub</a> / 
            <a href="/sites/InfrastructureV2">Infrastructure</a> / {config.name}
          </div>
          <h1 className={styles.heroTitle}>
            <span
              className={styles.heroIcon}
              {...(config.icon.startsWith('<svg')
                ? { dangerouslySetInnerHTML: { __html: config.icon } }
                : { children: config.icon }
              )}
            />
            {config.name} Platform
          </h1>
          <p className={styles.heroSubtitle}>{config.subtitle}</p>
        </div>
      </section>

      {/* Main Content */}
      <div className={styles.mainContent}>
        {/* Sidebar */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Navigation</div>
          <nav className={styles.sidebarNav}>
            {config.sections.map((section) => (
              <a
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className={styles.navIcon}>{section.icon}</span>
                {section.title}
              </a>
            ))}
          </nav>
          
          <div className={styles.navDivider}></div>
          
          <div className={styles.sidebarTitle}>Quick Links</div>
          <nav className={styles.sidebarNav}>
            {config.quickLinks.slice(0, 4).map((link, index) => (
              <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.navItem}>
                <span className={styles.navIcon}>{link.icon}</span>
                {link.title}
              </a>
            ))}
          </nav>
          
          <div className={styles.navDivider}></div>
          
          <div className={styles.sidebarTitle}>Resources</div>
          <nav className={styles.sidebarNav}>
            <a href="/sites/ITOpsHub/SitePages/Runbooks.aspx" className={styles.navItem}>
              <span className={styles.navIcon}>📚</span>
              Runbooks
            </a>
            <a href="/sites/ITOpsHub/SitePages/Escalation.aspx" className={styles.navItem}>
              <span className={styles.navIcon}>📞</span>
              Escalation Matrix
            </a>
            <a href="https://fixit.lebara.com/app/lebara/HomePage.do" target="_blank" rel="noopener noreferrer" className={styles.navItem}>
              <span className={styles.navIcon}>🎫</span>
              Raise Ticket
            </a>
          </nav>
        </aside>

        {/* Content Area */}
        <div className={styles.contentArea}>
          {/* Stats Overview */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.icon}>📊</span>
                Resource Overview
              </h2>
              <a href={config.consoleUrl} target="_blank" rel="noopener noreferrer" className={styles.sectionAction}>
                View in {config.consoleName} →
              </a>
            </div>
            <div className={styles.sectionContent}>
              {statsLoading && <div className={styles.loadingMessage}>Fetching live data...</div>}
              <div className={styles.quickStats}>
                {stats.map((stat: any, index: number) => (
                  <div key={index} className={styles.quickStat}>
                    <div className={styles.quickStatIcon}>{stat.icon}</div>
                    <div className={styles.quickStatValue}>{stat.value}</div>
                    <div className={styles.quickStatLabel}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* IPAM Dashboard - only for networking section on Azure platform */}
          {platform === 'azure' && activeSection === 'networking' && (
            <NetworkingDashboard aadHttpClient={aadHttpClient} />
          )}

          {/* Certificate Monitor Hero — Azure Certificates tab only */}
          {platform === 'azure' && activeSection === 'certificates' && (
            <CertificateHeroBanner
              spHttpClient={spHttpClient}
              siteUrl={siteUrl}
              monitorPageUrl="https://lebaragroup.sharepoint.com/sites/InfrastructureV2/SitePages/CertificateMonitor.aspx"
            />
          )}

          {/* Current Section Documents */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.icon}>{currentSection?.icon}</span>
                {currentSection?.title}
              </h2>
              <a 
                href={`/sites/InfrastructureV2/Shared Documents/${currentSection?.folder}`} 
                className={styles.sectionAction}
              >
                View All Documents →
              </a>
            </div>
            <div className={styles.sectionContent}>
              {loading ? (
                <div className={styles.loading}>Loading documents...</div>
              ) : currentDocs.length > 0 ? (
                <div className={styles.docGrid}>
                  {currentDocs.map((doc, index) => (
                    <a key={index} href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.docCard}>
                      <div className={`${styles.docIcon} ${styles[doc.type]}`}>
                        {getFileIcon(doc.type)}
                      </div>
                      <div className={styles.docInfo}>
                        <div className={styles.docName}>{doc.name}</div>
                        <div className={styles.docMeta}>Modified {doc.modified}</div>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyState}>
                  No documents found in this section. 
                  <a href={`/sites/InfrastructureV2/Shared Documents/${currentSection?.folder}`}>
                    Upload documents →
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Quick Access */}
          <section className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <span className={styles.icon}>🔗</span>
                Quick Access
              </h2>
            </div>
            <div className={styles.sectionContent}>
              <div className={styles.externalLinks}>
                {config.quickLinks.map((link, index) => (
                  <a key={index} href={link.url} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
                    <span className={styles.linkIcon}>{link.icon}</span>
                    {link.title}
                  </a>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className={styles.footer}>
        Infrastructure • <a href="/sites/ITOpsHub">IT Operations Hub</a> • <a href="mailto:infrastructure@lebara.com">Contact Support</a>
      </footer>

      {/* Feedback Button */}
      {props.graphClient && (
        <FeedbackButton
          spHttpClient={spHttpClient}
          graphClient={props.graphClient}
          siteUrl={siteUrl}
          currentPage={platform === 'azure' ? 'Azure' : 'AWS'}
        />
      )}
    </div>
  );
};

export default CloudPlatform;
