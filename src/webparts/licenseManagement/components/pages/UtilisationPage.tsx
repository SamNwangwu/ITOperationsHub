import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceSku, IKpiSummary } from '../../models/ILicenceData';
import { KpiCard } from '../ui';
import { UtilisationGauge } from '../charts';
import { getTierLabel, getTierColour, classifySkuWithPurchased, ISkuClassification } from '../../utils/SkuClassifier';

interface IClassifiedSku extends ILicenceSku {
  classification: ISkuClassification;
}

interface IAttentionSkus {
  overAllocated: IClassifiedSku[];
  nearCapacity: IClassifiedSku[];
  underUtilised: IClassifiedSku[];
}

export interface IUtilisationPageProps {
  kpi: IKpiSummary;
  attentionSkus: IAttentionSkus;
  corePaidSkus: ILicenceSku[];
  paidSkus: ILicenceSku[];
  allSkus: ILicenceSku[];
}

const UtilisationPage: React.FC<IUtilisationPageProps> = ({
  kpi,
  attentionSkus,
  corePaidSkus,
  paidSkus,
  allSkus
}) => {
  const [allSkusExpanded, setAllSkusExpanded] = React.useState(false);

  const allSkusClassified = allSkus.map(sku => ({
    ...sku,
    classification: classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned)
  }));

  const hasAttentionItems =
    attentionSkus.overAllocated.length > 0 ||
    attentionSkus.nearCapacity.length > 0 ||
    attentionSkus.underUtilised.length > 0;

  const getUtilisationClass = (pct: number): string => {
    if (pct >= 100) return styles.utilisationPctRed;
    if (pct >= 90) return styles.utilisationPctAmber;
    if (pct < 50) return styles.utilisationPctGrey;
    return styles.utilisationPctGreen;
  };

  const renderAttentionRow = (
    sku: IClassifiedSku,
    statusClass: string,
    statusLabel: string,
    statusIcon: React.ReactElement
  ): React.ReactElement => (
    <tr key={sku.Id} className={styles.utilisationTableRow}>
      <td className={styles.utilisationTableCellBold}>{sku.Title}</td>
      <td className={styles.utilisationTableCell}>
        <span className={styles.utilisationTierBadge} style={{ background: getTierColour(sku.classification.tier) }}>
          {getTierLabel(sku.classification.tier)}
        </span>
      </td>
      <td className={styles.utilisationTableCellRight}>{sku.Assigned.toLocaleString()}</td>
      <td className={styles.utilisationTableCellRight}>{sku.Purchased.toLocaleString()}</td>
      <td className={styles.utilisationTableCellRight}>
        <span className={getUtilisationClass(sku.UtilisationPct)}>{sku.UtilisationPct}%</span>
      </td>
      <td className={styles.utilisationTableCell}>
        <span className={`${styles.utilisationStatusBadge} ${statusClass}`}>
          {statusIcon}
          {statusLabel}
        </span>
      </td>
    </tr>
  );

  const overAllocatedIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
    </svg>
  );

  const nearCapacityIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );

  const underUtilisedIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
    </svg>
  );

  return (
    <div className={styles.pageContent}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>Utilisation & Adoption</div>
        <div className={styles.pageSubtitle}>
          Licence utilisation across SKUs and user adoption metrics
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <KpiCard
          title="Overall Utilisation"
          value={`${kpi.overallUtilisationPct}%`}
          color={kpi.overallUtilisationPct >= 80 ? 'green' : 'orange'}
          subtitle="Across paid SKUs"
        />
        <KpiCard
          title="Active Users"
          value={`${kpi.activeUsersPct}%`}
          color={kpi.activeUsersPct >= 80 ? 'green' : 'orange'}
          subtitle={`${kpi.activeUsersCount} of ${kpi.totalLicensedUsers}`}
        />
        <KpiCard
          title="Inactive 90+ Days"
          value={kpi.inactiveCount.toString()}
          color={kpi.inactiveCount > 0 ? 'orange' : 'green'}
          subtitle="Potential optimisation"
        />
        <KpiCard
          title="Available Licences"
          value={(kpi.totalPurchasedLicences - kpi.totalAssignedLicences).toString()}
          color="blue"
          subtitle="Unassigned capacity"
        />
      </div>

      {/* Section 1: Attention Required Table */}
      {hasAttentionItems && (
        <>
          <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
            <div className={styles.sectionTitle}>Attention Required</div>
          </div>
          <div className={styles.utilisationAttentionWrap}>
            <table className={`${styles.dataTable} ${styles.utilisationTable}`}>
              <thead>
                <tr>
                  <th className={styles.utilisationTableHead}>SKU</th>
                  <th className={styles.utilisationTableHead}>Tier</th>
                  <th className={styles.utilisationTableHeadRight}>Assigned</th>
                  <th className={styles.utilisationTableHeadRight}>Purchased</th>
                  <th className={styles.utilisationTableHeadRight}>Utilisation</th>
                  <th className={styles.utilisationTableHead}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attentionSkus.overAllocated.map(sku =>
                  renderAttentionRow(
                    sku,
                    styles.utilisationStatusOver,
                    `Over-allocated (+${sku.Assigned - sku.Purchased})`,
                    overAllocatedIcon
                  )
                )}
                {attentionSkus.nearCapacity.map(sku =>
                  renderAttentionRow(
                    sku,
                    styles.utilisationStatusNear,
                    `Near capacity (${sku.Purchased - sku.Assigned} left)`,
                    nearCapacityIcon
                  )
                )}
                {attentionSkus.underUtilised.map(sku =>
                  renderAttentionRow(
                    sku,
                    styles.utilisationStatusUnder,
                    `Under-utilised (${sku.Purchased - sku.Assigned} unused)`,
                    underUtilisedIcon
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Section 2: Core Paid Licence Gauges */}
      <div className={styles.sectionHeader} style={{ padding: '0 32px', marginBottom: '16px' }}>
        <div className={styles.sectionTitle}>Core Licence Utilisation</div>
      </div>
      {corePaidSkus.length > 0 ? (
        <div className={styles.utilisationGaugeGrid}>
          {corePaidSkus.map(sku => (
            <UtilisationGauge
              key={sku.Id}
              value={sku.UtilisationPct}
              title={sku.Title}
              subtitle={`${sku.Assigned.toLocaleString()} of ${sku.Purchased.toLocaleString()}`}
              assigned={sku.Assigned}
              purchased={sku.Purchased}
            />
          ))}
        </div>
      ) : (
        <div className={styles.utilisationEmptyState}>
          No core paid SKUs found in the licence data.
        </div>
      )}

      {/* Section 3: Collapsible All Licences Table */}
      <div className={styles.utilisationAllSkusWrap}>
        <button
          className={styles.utilisationToggleBtn}
          onClick={() => setAllSkusExpanded(!allSkusExpanded)}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`${styles.utilisationToggleIcon}${allSkusExpanded ? ` ${styles.utilisationToggleIconExpanded}` : ''}`}
          >
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          All Licences ({allSkusClassified.length} total - {paidSkus.length} paid)
        </button>

        {allSkusExpanded && (
          <div className={styles.utilisationAllSkusTableWrap}>
            <table className={`${styles.dataTable} ${styles.utilisationTable}`}>
              <thead>
                <tr>
                  <th className={styles.utilisationTableHead}>SKU</th>
                  <th className={styles.utilisationTableHead}>Tier</th>
                  <th className={styles.utilisationTableHeadRight}>Assigned</th>
                  <th className={styles.utilisationTableHeadRight}>Purchased</th>
                  <th className={styles.utilisationTableHeadRight}>Available</th>
                  <th className={styles.utilisationTableHeadRight}>Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {allSkusClassified.map(sku => {
                  const available = sku.Purchased - sku.Assigned;
                  return (
                    <tr
                      key={sku.Id}
                      className={`${styles.utilisationTableRow}${sku.classification.isExcludedFromAggregates ? ` ${styles.utilisationTableRowDimmed}` : ''}`}
                    >
                      <td className={styles.utilisationTableCell}>
                        <div className={styles.utilisationSkuTitle}>{sku.Title}</div>
                        <div className={styles.utilisationSkuPart}>{sku.SkuPartNumber}</div>
                      </td>
                      <td className={styles.utilisationTableCell}>
                        <span className={styles.utilisationTierBadge} style={{ background: getTierColour(sku.classification.tier) }}>
                          {getTierLabel(sku.classification.tier)}
                        </span>
                      </td>
                      <td className={styles.utilisationTableCellRight}>{sku.Assigned.toLocaleString()}</td>
                      <td className={styles.utilisationTableCellRight}>{sku.Purchased.toLocaleString()}</td>
                      <td className={styles.utilisationTableCellRight}>
                        <span className={available < 0 ? styles.utilisationAvailableNeg : styles.utilisationAvailableNormal}>
                          {available.toLocaleString()}
                        </span>
                      </td>
                      <td className={styles.utilisationTableCellRight}>
                        <span className={getUtilisationClass(sku.UtilisationPct)}>
                          {sku.UtilisationPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UtilisationPage;
