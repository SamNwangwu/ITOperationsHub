/**
 * CertificateHeroBanner — hero stats panel for the Azure > Certificates tab.
 *
 * Data contract (from CertificateMonitor repo – InfrastructureV2/CertMonitor):
 *   SharePoint list : CertInventory
 *   Key columns     : Title (server), Subject, Expiry (DateTime), DaysLeft (Number),
 *                     Thumbprint, Issuer, Template, Store, IsExportable, IsSelfSigned,
 *                     Criticality, ScanDate (DateTime), SAN
 *
 * Status thresholds (same as CertMonitor source):
 *   days < 0   → expired
 *   days <= 30  → critical  (<30 d)
 *   days <= 60  → warning   (30-60 d)
 *   days <= 90  → attention (61-90 d)
 *   days > 90   → healthy
 *
 * For the hero banner we condense into four buckets:
 *   Expired      : days < 0
 *   Expiring <30d: 0 <= days <= 30
 *   Expiring <90d: 31 <= days <= 90
 *   Healthy      : days > 90
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { SPHttpClient, SPHttpClientResponse } from '@microsoft/sp-http';
import styles from './CertificateHeroBanner.module.scss';

export interface ICertificateHeroBannerProps {
  spHttpClient: SPHttpClient;
  siteUrl: string;
  monitorPageUrl: string;
}

interface ICertListItem {
  Subject: string;
  DaysLeft: number;
  Expiry: string;
}

interface ICertStats {
  total: number;
  expired: number;
  expiring30: number;
  expiring90: number;
  healthy: number;
  nextExpiry: { name: string; days: number; date: string } | null;
}

const CertificateHeroBanner: React.FC<ICertificateHeroBannerProps> = (props) => {
  const { spHttpClient, siteUrl, monitorPageUrl } = props;

  const [stats, setStats] = useState<ICertStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!spHttpClient || !siteUrl) {
      setLoading(false);
      setError(true);
      return;
    }

    var apiUrl = siteUrl +
      "/_api/web/lists/getByTitle('CertInventory')/items" +
      '?$select=Subject,DaysLeft,Expiry' +
      '&$top=5000' +
      '&$orderby=DaysLeft asc';

    spHttpClient.get(apiUrl, SPHttpClient.configurations.v1)
      .then(function (response: SPHttpClientResponse) {
        if (!response.ok) { throw new Error('HTTP ' + response.status); }
        return response.json();
      })
      .then(function (data: { value?: ICertListItem[] }) {
        var items: ICertListItem[] = data.value || [];
        var expired = 0;
        var expiring30 = 0;
        var expiring90 = 0;
        var healthy = 0;
        var nextExpiry: ICertStats['nextExpiry'] = null;

        for (var i = 0; i < items.length; i++) {
          var d = items[i].DaysLeft != null ? items[i].DaysLeft : 0;
          if (d < 0) {
            expired++;
          } else if (d <= 30) {
            expiring30++;
          } else if (d <= 90) {
            expiring90++;
          } else {
            healthy++;
          }

          // Track soonest upcoming (non-expired) cert
          if (d >= 0 && nextExpiry === null) {
            nextExpiry = {
              name: items[i].Subject || '(unnamed)',
              days: d,
              date: items[i].Expiry
                ? new Date(items[i].Expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : ''
            };
          }
        }

        setStats({
          total: items.length,
          expired: expired,
          expiring30: expiring30,
          expiring90: expiring90,
          healthy: healthy,
          nextExpiry: nextExpiry
        });
        setLoading(false);
      })
      .catch(function () {
        setError(true);
        setLoading(false);
      });
  }, [spHttpClient, siteUrl]);

  // ── Loading skeleton ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.certHeroBanner}>
        <div className={styles.bannerLoading}>
          <div className={styles.shimmer} />
          <div className={styles.shimmer} />
          <div className={styles.shimmer} />
          <div className={styles.shimmer} />
        </div>
      </div>
    );
  }

  // ── Error / list not accessible ─────────────────────────────────────
  if (error || !stats) {
    return (
      <div className={styles.certHeroBanner}>
        <div className={styles.bannerError}>
          <span className={styles.errorIcon}>🔐</span>
          <span>Connect to Certificate Monitor to view live stats</span>
          <a href={monitorPageUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
            Open Certificate Monitor →
          </a>
        </div>
      </div>
    );
  }

  // ── Render stats ────────────────────────────────────────────────────
  return (
    <div className={styles.certHeroBanner}>
      {/* Stat cards */}
      <div className={styles.statsRow}>
        <div className={styles.statCard + ' ' + styles.statTotal}>
          <div className={styles.statValue}>{stats.total}</div>
          <div className={styles.statLabel}>Total Monitored</div>
        </div>
        <div className={styles.statCard + ' ' + styles.statExpired}>
          <div className={styles.statValue}>{stats.expired}</div>
          <div className={styles.statLabel}>Expired</div>
        </div>
        <div className={styles.statCard + ' ' + styles.statCritical}>
          <div className={styles.statValue}>{stats.expiring30}</div>
          <div className={styles.statLabel}>Expiring &lt;30d</div>
        </div>
        <div className={styles.statCard + ' ' + styles.statWarning}>
          <div className={styles.statValue}>{stats.expiring90}</div>
          <div className={styles.statLabel}>Expiring &lt;90d</div>
        </div>
        <div className={styles.statCard + ' ' + styles.statHealthy}>
          <div className={styles.statValue}>{stats.healthy}</div>
          <div className={styles.statLabel}>Healthy</div>
        </div>
      </div>

      {/* Next expiry callout */}
      <div className={styles.nextExpiryRow}>
        {stats.nextExpiry ? (
          <span className={styles.nextExpiryText}>
            Next Expiry: <strong>{stats.nextExpiry.name}</strong> expires in{' '}
            <strong>{stats.nextExpiry.days} days</strong>
            {stats.nextExpiry.date ? ' (' + stats.nextExpiry.date + ')' : ''}
          </span>
        ) : (
          <span className={styles.nextExpiryText}>No upcoming certificate expiries</span>
        )}
        <a href={monitorPageUrl} target="_blank" rel="noopener noreferrer" className={styles.ctaButton}>
          View Full Monitor →
        </a>
      </div>
    </div>
  );
};

export default CertificateHeroBanner;
