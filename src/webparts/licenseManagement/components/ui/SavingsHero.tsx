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
 * Uses Lebara magenta gradient styling
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
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
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
