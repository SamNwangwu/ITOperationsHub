import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { AadHttpClient } from '@microsoft/sp-http';
import styles from './NetworkingDashboard.module.scss';
import { IpamService, IIpamSummary, ISubnet } from '../services/IpamService';

export interface INetworkingDashboardProps {
  aadHttpClient?: AadHttpClient;
}

const IPAM_DASHBOARD_URL = 'https://lbripam-g6jyrscvaao6k.azurewebsites.net';

export const NetworkingDashboard: React.FC<INetworkingDashboardProps> = (props) => {
  const { aadHttpClient } = props;

  const [summary, setSummary] = useState<IIpamSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!aadHttpClient) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const service = new IpamService(aadHttpClient);
      const data = await service.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('IPAM fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load IPAM data');
    } finally {
      setLoading(false);
    }
  }, [aadHttpClient]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getUtilisationClass = (pct: number): string => {
    if (pct >= 85) return 'red';
    if (pct >= 60) return 'amber';
    return 'green';
  };

  const getUtilisationTextClass = (pct: number): string => {
    if (pct >= 85) return styles.utilisationCritical;
    if (pct >= 60) return styles.utilisationWarning;
    return styles.utilisationGood;
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const getSubnetUtilisation = (subnet: ISubnet): number => {
    return subnet.size > 0 ? Math.round((subnet.used / subnet.size) * 100) : 0;
  };

  // If no AAD client, show pending state
  if (!aadHttpClient) {
    return (
      <div className={styles.networkingDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>📊</span>
              IPAM Dashboard
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.pendingState}>
              <div className={styles.pendingIcon}>🔗</div>
              <div className={styles.pendingMessage}>
                IPAM integration pending API approval. Access the full dashboard below.
              </div>
              <a
                href={IPAM_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dashboardButton}
              >
                <span>🌐</span>
                Open IPAM Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className={styles.networkingDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>📊</span>
              IPAM Dashboard
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.loading}>
              <div className={styles.loadingSpinner}></div>
              <div>Loading IPAM data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.networkingDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>📊</span>
              IPAM Dashboard
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>⚠️</div>
              <div className={styles.errorMessage}>{error}</div>
              <button className={styles.retryButton} onClick={fetchData}>
                🔄 Retry
              </button>
              <a
                href={IPAM_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dashboardButton}
              >
                Open IPAM Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // No spaces configured state
  if (!summary.spacesConfigured) {
    return (
      <div className={styles.networkingDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>📊</span>
              IPAM Dashboard
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.pendingState}>
              <div className={styles.pendingIcon}>📋</div>
              <div className={styles.pendingMessage}>
                IPAM Spaces not configured. Configure Spaces and Blocks in the IPAM Dashboard to see network data here.
              </div>
              <a
                href={IPAM_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dashboardButton}
              >
                <span>🌐</span>
                Open IPAM Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.networkingDashboard}>
      {/* Summary Stats */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>📊</span>
            Network Overview
          </h2>
          <a
            href={IPAM_DASHBOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sectionAction}
          >
            Open Full Dashboard →
          </a>
        </div>
        <div className={styles.sectionContent}>
          <div className={styles.summaryStats}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📦</div>
              <div className={styles.statValue}>{formatNumber(summary.totalSpaces)}</div>
              <div className={styles.statLabel}>Spaces</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>🌐</div>
              <div className={styles.statValue}>{formatNumber(summary.totalVnets)}</div>
              <div className={styles.statLabel}>Virtual Networks</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📡</div>
              <div className={styles.statValue}>{formatNumber(summary.totalSubnets)}</div>
              <div className={styles.statLabel}>Subnets</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>📈</div>
              <div className={`${styles.statValue} ${getUtilisationTextClass(summary.utilisationPct)}`}>
                {summary.utilisationPct}%
              </div>
              <div className={styles.statLabel}>IP Utilisation</div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Utilised Subnets */}
      {summary.topUtilisedSubnets.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>🔥</span>
              Highest Utilised Subnets
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.subnetTable}>
              <div className={styles.tableHeader}>
                <div>Subnet</div>
                <div>CIDR</div>
                <div>Usage</div>
                <div>Utilisation</div>
              </div>
              {summary.topUtilisedSubnets.map((subnet, index) => {
                const utilPct = getSubnetUtilisation(subnet);
                return (
                  <div key={index} className={styles.subnetRow}>
                    <div className={styles.subnetName}>
                      {subnet.name}
                      {subnet.vnetName && (
                        <div className={styles.vnetName}>{subnet.vnetName}</div>
                      )}
                    </div>
                    <div className={styles.subnetCidr}>{subnet.prefix}</div>
                    <div className={styles.subnetUsage}>
                      {formatNumber(subnet.used)} / {formatNumber(subnet.size)}
                    </div>
                    <div className={styles.utilisationBarContainer}>
                      <div className={styles.utilisationBar}>
                        <div
                          className={`${styles.utilisationFill} ${styles[getUtilisationClass(utilPct)]}`}
                          style={{ width: `${Math.min(utilPct, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`${styles.utilisationPct} ${getUtilisationTextClass(utilPct)}`}>
                        {utilPct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VNet Overview */}
      {summary.vnets.length > 0 && (
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>🗺️</span>
              VNet Overview
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.vnetTable}>
              <div className={styles.vnetHeader}>
                <div>VNet Name</div>
                <div>CIDR</div>
                <div>Subnets</div>
                <div>Utilisation</div>
                <div>Space / Block</div>
              </div>
              {summary.vnets.slice(0, 10).map((vnet, index) => {
                const utilPct = vnet.size > 0 ? Math.round((vnet.used / vnet.size) * 100) : 0;
                return (
                  <div key={index} className={styles.vnetRow}>
                    <div className={styles.vnetName}>{vnet.name}</div>
                    <div className={styles.vnetAddressSpace}>
                      {vnet.cidr || '-'}
                    </div>
                    <div className={styles.vnetSubnetCount}>
                      {vnet.subnets?.length || 0}
                    </div>
                    <div className={styles.utilisationBarContainer}>
                      <div className={styles.utilisationBar}>
                        <div
                          className={`${styles.utilisationFill} ${styles[getUtilisationClass(utilPct)]}`}
                          style={{ width: `${Math.min(utilPct, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`${styles.utilisationPct} ${getUtilisationTextClass(utilPct)}`}>
                        {utilPct}%
                      </span>
                    </div>
                    <div className={styles.vnetSubscription} title={`${vnet.spaceName} / ${vnet.blockName}`}>
                      {vnet.spaceName || '-'} / {vnet.blockName || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
            {summary.vnets.length > 10 && (
              <a
                href={IPAM_DASHBOARD_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.dashboardButton}
              >
                <span>🌐</span>
                View All {summary.vnets.length} VNets
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkingDashboard;
