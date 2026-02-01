import * as React from 'react';
import styles from './ItOpsHomepage.module.scss';
import { IItOpsHomepageProps, IItOpsHomepageState, IArchitectureDiagram } from './IItOpsHomepageProps';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';

// Lebara brand colours
const COLOURS = {
  primaryBlue: '#00289e',
  magenta: '#E4007D',
  lightBlue: '#00A4E4',
  darkBlue: '#001a4d',
  aws: '#FF9900',
  awsDark: '#232F3E',
  azure: '#0078D4',
  azureDark: '#002050'
};

export default class ItOpsHomepage extends React.Component<IItOpsHomepageProps, IItOpsHomepageState> {
  constructor(props: IItOpsHomepageProps) {
    super(props);
    this.state = {
      systemStatus: 'healthy',
      diagrams: [],
      isLoading: true
    };
  }

  public componentDidMount(): void {
    this._loadDiagrams();
    if (this.props.statusApiUrl) {
      this._checkStatus();
    } else {
      this.setState({ isLoading: false });
    }
  }

  private async _loadDiagrams(): Promise<void> {
    if (!this.props.diagramsLibraryUrl) {
      // Use placeholders
      this.setState({
        diagrams: [
          { title: 'Network Architecture', description: 'VPCs, subnets, connectivity', imageUrl: '', linkUrl: '#' },
          { title: 'CI/CD Pipeline', description: 'Build and deployment flows', imageUrl: '', linkUrl: '#' },
          { title: 'Security Architecture', description: 'IAM, firewalls, encryption', imageUrl: '', linkUrl: '#' },
          { title: 'Data Architecture', description: 'Databases, storage, backups', imageUrl: '', linkUrl: '#' }
        ],
        isLoading: false
      });
      return;
    }

    try {
      const response: SPHttpClientResponse = await this.props.context.spHttpClient.get(
        `${this.props.context.pageContext.web.absoluteUrl}/_api/web/GetFolderByServerRelativeUrl('${this.props.diagramsLibraryUrl}')/Files`,
        SPHttpClient.configurations.v1
      );
      const data = await response.json();
      
      const diagrams: IArchitectureDiagram[] = data.value
        .filter((file: any) => /\.(png|jpg|jpeg|gif|svg)$/i.test(file.Name))
        .map((file: any) => ({
          title: file.Name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
          description: '',
          imageUrl: `${this.props.context.pageContext.web.absoluteUrl}/${this.props.diagramsLibraryUrl}/${file.Name}`,
          linkUrl: `${this.props.context.pageContext.web.absoluteUrl}/${this.props.diagramsLibraryUrl}/${file.Name}`
        }));

      this.setState({ diagrams, isLoading: false });
    } catch (error) {
      console.error('Failed to load diagrams:', error);
      this.setState({ isLoading: false });
    }
  }

  private async _checkStatus(): Promise<void> {
    // Placeholder for New Relic API integration
    // In production, you'd call the API and parse the response
    this.setState({ systemStatus: 'healthy', isLoading: false });
  }

  public render(): React.ReactElement<IItOpsHomepageProps> {
    const { heroTitle, heroSubtitle, heroBackground, heroImage, showStatusBadge, platformCards, quickLinks, showArchitectureDiagrams } = this.props;
    const { systemStatus, diagrams } = this.state;

    return (
      <div className={styles.itOpsHomepage}>
        {/* Hero Banner */}
        <section 
          className={styles.hero}
          style={{ 
            background: heroImage 
              ? `linear-gradient(135deg, ${heroBackground}dd 0%, ${heroBackground}99 100%), url(${heroImage}) center/cover`
              : `linear-gradient(135deg, ${COLOURS.darkBlue} 0%, ${heroBackground} 50%, ${COLOURS.primaryBlue} 100%)`
          }}
        >
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{heroTitle}</h1>
            <p className={styles.heroSubtitle}>{heroSubtitle}</p>
            
            {showStatusBadge && (
              <div className={styles.statusBadge} data-status={systemStatus}>
                <span className={styles.statusDot}></span>
                <span className={styles.statusText}>
                  {systemStatus === 'healthy' && 'All Systems Operational'}
                  {systemStatus === 'degraded' && 'Degraded Performance'}
                  {systemStatus === 'down' && 'Service Disruption'}
                  {systemStatus === 'loading' && 'Checking Status...'}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Platform Cards */}
        {platformCards && platformCards.length > 0 && (
          <section className={styles.platformSection}>
            <div className={styles.platformGrid}>
              {platformCards.map((card, index) => (
                <a 
                  key={index} 
                  href={card.url} 
                  className={styles.platformCard}
                  style={{ background: card.backgroundColour }}
                >
                  <div className={styles.platformIcon}>{card.icon}</div>
                  <div className={styles.platformInfo}>
                    <h3 className={styles.platformTitle} style={{ color: card.colour }}>{card.title}</h3>
                    <p className={styles.platformDescription}>{card.description}</p>
                  </div>
                  <div className={styles.platformArrow}>→</div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Quick Links */}
        {quickLinks && quickLinks.length > 0 && (
          <section className={styles.quickLinksSection}>
            <h2 className={styles.sectionTitle}>Quick Access</h2>
            <div className={styles.quickLinksGrid}>
              {quickLinks.map((link, index) => (
                <a key={index} href={link.url} className={styles.quickLink} target={link.url.startsWith('http') ? '_blank' : '_self'}>
                  <span className={styles.quickLinkIcon}>{link.icon}</span>
                  <span className={styles.quickLinkTitle}>{link.title}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Architecture Diagrams */}
        {showArchitectureDiagrams && (
          <section className={styles.diagramsSection}>
            <h2 className={styles.sectionTitle}>Architecture Diagrams</h2>
            <div className={styles.diagramsGrid}>
              {diagrams.map((diagram, index) => (
                <a key={index} href={diagram.linkUrl || '#'} className={styles.diagramCard}>
                  {diagram.imageUrl ? (
                    <img src={diagram.imageUrl} alt={diagram.title} className={styles.diagramImage} />
                  ) : (
                    <div className={styles.diagramPlaceholder}>
                      <span className={styles.placeholderIcon}>📐</span>
                    </div>
                  )}
                  <div className={styles.diagramInfo}>
                    <h4 className={styles.diagramTitle}>{diagram.title}</h4>
                    {diagram.description && <p className={styles.diagramDescription}>{diagram.description}</p>}
                    {!diagram.imageUrl && <span className={styles.comingSoon}>Coming Soon</span>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className={styles.footer}>
          <p>IT Operations Hub • <a href="https://lebara.sharepoint.com/sites/ITOpsHub">Home</a> • <a href="mailto:infrastructure@lebara.com">Contact</a></p>
        </footer>
      </div>
    );
  }
}
