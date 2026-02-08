import * as React from 'react';
import styles from '../LicenseManagement.module.scss';

export interface ISavingsHeroProps {
  monthlyAmount: number;
  annualAmount: number;
  issueCount: number;
  monthlySpend: number;
}

/**
 * Savings Hero component - prominently displays potential cost savings
 * Uses Lebara blue gradient styling
 */
const SavingsHero: React.FC<ISavingsHeroProps> = ({
  monthlyAmount,
  annualAmount,
  issueCount,
  monthlySpend
}) => {
  const savingsPct = monthlySpend > 0 ? Math.round((monthlyAmount / monthlySpend) * 100) : 0;

  return (
    <div className={styles.savingsHero}>
      <div className={styles.savingsIcon}>
        <span style={{ fontSize: '28px', fontWeight: 700 }}>{'\u00A3'}</span>
      </div>
      <div className={styles.savingsContent}>
        <div className={styles.savingsLabel}>Potential Annual Savings</div>
        <div className={styles.savingsAmount}>{'\u00A3'}{annualAmount.toLocaleString()}</div>
        <div className={styles.savingsDetail}>
          <span>{'\u00A3'}{monthlyAmount.toLocaleString()}/month</span>
          <span className={styles.savingsDivider}>|</span>
          <span>{savingsPct}% of spend</span>
          <span className={styles.savingsDivider}>|</span>
          <span>{issueCount} issues to resolve</span>
        </div>
      </div>
      <div className={styles.savingsAction}>
        <button className={styles.btnPrimary}>View Opportunities</button>
      </div>
    </div>
  );
};

export default SavingsHero;
