import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceSku, ILicencePricing } from '../../models/ILicenceData';

export interface ISkuCardProps {
  sku: ILicenceSku;
  pricing?: ILicencePricing;
  onClick?: () => void;
}

/**
 * SKU Card component for displaying licence type summary
 */
const SkuCard: React.FC<ISkuCardProps> = ({
  sku,
  pricing,
  onClick
}) => {
  const getStatus = (): { label: string; class: string } => {
    if (sku.Assigned > sku.Purchased) {
      return { label: 'Over-allocated', class: styles.statusCritical };
    }
    if (sku.UtilisationPct >= 90) {
      return { label: 'Near capacity', class: styles.statusWarning };
    }
    if (sku.UtilisationPct < 50) {
      return { label: 'Under-utilised', class: styles.statusInfo };
    }
    return { label: 'Healthy', class: styles.statusHealthy };
  };

  const status = getStatus();
  const monthlyCost = pricing ? sku.Assigned * pricing.MonthlyCostPerUser : 0;
  const annualCost = pricing ? sku.Assigned * pricing.AnnualCostPerUser : 0;

  return (
    <div
      className={`${styles.skuCard} ${onClick ? styles.clickable : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
    >
      <div className={styles.skuHeader}>
        <div className={styles.skuName}>{sku.Title}</div>
        <span className={`${styles.skuStatus} ${status.class}`}>{status.label}</span>
      </div>
      <div className={styles.skuPartNumber}>{sku.SkuPartNumber}</div>

      <div className={styles.skuStats}>
        <div className={styles.skuStat}>
          <span className={styles.skuStatValue}>{sku.Purchased}</span>
          <span className={styles.skuStatLabel}>Purchased</span>
        </div>
        <div className={styles.skuStat}>
          <span className={`${styles.skuStatValue} ${sku.Assigned > sku.Purchased ? styles.textDanger : ''}`}>
            {sku.Assigned}
          </span>
          <span className={styles.skuStatLabel}>Assigned</span>
        </div>
        <div className={styles.skuStat}>
          <span className={`${styles.skuStatValue} ${sku.Available < 0 ? styles.textDanger : styles.textSuccess}`}>
            {sku.Available}
          </span>
          <span className={styles.skuStatLabel}>{sku.Available < 0 ? 'Deficit' : 'Available'}</span>
        </div>
      </div>

      <div className={styles.skuUtilisation}>
        <div className={styles.utilisationBar}>
          <div
            className={`${styles.utilisationFill} ${sku.UtilisationPct > 100 ? styles.overAllocated : ''}`}
            style={{ width: `${Math.min(sku.UtilisationPct, 100)}%` }}
          />
        </div>
        <span className={styles.utilisationText}>{Math.round(sku.UtilisationPct)}% utilisation</span>
      </div>

      {pricing && (
        <div className={styles.skuCost}>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Monthly:</span>
            <span className={styles.costValue}>{'\u00A3'}{monthlyCost.toLocaleString()}</span>
          </div>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Annual:</span>
            <span className={styles.costValue}>{'\u00A3'}{annualCost.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SkuCard;
