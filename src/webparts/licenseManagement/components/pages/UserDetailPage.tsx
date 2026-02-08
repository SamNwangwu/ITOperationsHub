import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceUser, ILicenceSku, ILicencePricing, IUsageReport } from '../../models/ILicenceData';
import { classifySkuWithPurchased, getTierLabel, getTierColour, getSkuFriendlyName } from '../../utils/SkuClassifier';

export interface IUserDetailPageProps {
  user: ILicenceUser;
  skus: ILicenceSku[];
  pricing: ILicencePricing[];
  usage?: IUsageReport[];
  onBack: () => void;
}

/**
 * User Detail Page - Drill-through view for individual user
 */
const UserDetailPage: React.FC<IUserDetailPageProps> = ({
  user,
  skus,
  pricing,
  usage,
  onBack
}) => {
  // Parse user's licences
  const userLicences = user.Licences
    ? user.Licences.split(',').map(l => l.trim()).filter(l => l)
    : [];

  // Get usage data for this user
  const userUsage = usage?.find(u => u.Title === user.UserPrincipalName);

  // Get details for each licence with tier classification
  const licenceDetails = userLicences.map(licenceName => {
    const sku = skus.find(s => s.Title === licenceName || s.SkuPartNumber === licenceName);
    // Try direct price match, then fallback via friendly name
    let price = pricing.find(p => p.Title === licenceName);
    if (!price && sku) {
      const friendlyName = getSkuFriendlyName(sku.SkuPartNumber);
      price = pricing.find(p => p.Title === friendlyName);
    }
    const classification = sku
      ? classifySkuWithPurchased(sku.SkuPartNumber, sku.Purchased, sku.Assigned)
      : null;
    return {
      name: licenceName,
      sku,
      price,
      classification,
      monthlyCost: price?.MonthlyCostPerUser || 0,
      annualCost: price?.AnnualCostPerUser || 0
    };
  });

  const totalMonthlyCost = licenceDetails.reduce((sum, l) => sum + l.monthlyCost, 0);
  const totalAnnualCost = licenceDetails.reduce((sum, l) => sum + l.annualCost, 0);

  // Get initials for avatar
  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Format date
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status colour
  const getStatusColour = (): string => {
    if (!user.AccountEnabled) return '#EF4444';
    if (user.DaysSinceSignIn > 90) return '#F59E0B';
    return '#10B981';
  };

  const getStatusText = (): string => {
    if (!user.AccountEnabled) return 'Disabled';
    if (user.DaysSinceSignIn > 90) return 'Inactive';
    return 'Active';
  };

  return (
    <div className={styles.pageContent}>
      {/* Back Button */}
      <div style={{ padding: '16px 32px' }}>
        <button className={styles.backButton} onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Users
        </button>
      </div>

      {/* User Header */}
      <div className={styles.userDetailHeader}>
        <div className={styles.userDetailAvatar}>
          {getInitials(user.Title)}
        </div>
        <div className={styles.userDetailInfo}>
          <div className={styles.userDetailName}>{user.Title}</div>
          <div className={styles.userDetailEmail}>{user.UserPrincipalName}</div>
          <div className={styles.userDetailMeta}>
            <div className={styles.userDetailMetaItem}>
              <span>Department:</span> {user.Department || 'Not set'}
            </div>
            <div className={styles.userDetailMetaItem}>
              <span>Job Title:</span> {user.JobTitle || 'Not set'}
            </div>
            <div className={styles.userDetailMetaItem}>
              <span>Status:</span>
              <span style={{ color: getStatusColour(), fontWeight: 600, marginLeft: '4px' }}>
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#E4007D' }}>
            {'\u00A3'}{totalMonthlyCost.toLocaleString()}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280' }}>Monthly Cost</div>
          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
            {'\u00A3'}{totalAnnualCost.toLocaleString()}/year
          </div>
        </div>
      </div>

      {/* Activity Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '20px',
        padding: '24px 32px',
        background: '#111827',
        borderBottom: '1px solid #1F2937'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#F9FAFB' }}>
            {formatDate(user.LastSignInDate)}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Last Sign-In</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 600,
            color: user.DaysSinceSignIn > 90 ? '#F59E0B' : user.DaysSinceSignIn > 30 ? '#00A4E4' : '#10B981'
          }}>
            {user.DaysSinceSignIn} days
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Days Since Sign-In</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '20px', fontWeight: 600, color: '#F9FAFB' }}>
            {userLicences.length}
          </div>
          <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Licences Assigned</div>
        </div>
      </div>

      {/* Storage Usage Section */}
      {userUsage && (userUsage.OneDriveUsedGB !== undefined || userUsage.MailboxUsedGB !== undefined) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          padding: '24px 32px',
          background: 'rgba(0, 40, 158, 0.05)',
          borderBottom: '1px solid #1F2937'
        }}>
          {/* OneDrive Storage */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00A4E4" strokeWidth="2">
                <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
              </svg>
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>OneDrive Storage</span>
            </div>
            {userUsage.OneDriveUsedGB !== undefined && userUsage.OneDriveAllocatedGB ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#F9FAFB' }}>
                    {userUsage.OneDriveUsedGB.toFixed(1)} GB
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    of {userUsage.OneDriveAllocatedGB} GB
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#1F2937',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (userUsage.OneDriveUsedGB / userUsage.OneDriveAllocatedGB) * 100)}%`,
                    background: userUsage.OneDriveUsedGB / userUsage.OneDriveAllocatedGB > 0.9 ? '#F59E0B' : '#00A4E4',
                    borderRadius: '3px',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  {Math.round((userUsage.OneDriveUsedGB / userUsage.OneDriveAllocatedGB) * 100)}% used
                </div>
              </>
            ) : (
              <div style={{ color: '#6B7280', fontSize: '13px' }}>No data available</div>
            )}
          </div>

          {/* Mailbox Storage */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E4007D" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Mailbox Storage</span>
            </div>
            {userUsage.MailboxUsedGB !== undefined && userUsage.MailboxAllocatedGB ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#F9FAFB' }}>
                    {userUsage.MailboxUsedGB.toFixed(1)} GB
                  </span>
                  <span style={{ fontSize: '12px', color: '#6B7280' }}>
                    of {userUsage.MailboxAllocatedGB} GB
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  background: '#1F2937',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, (userUsage.MailboxUsedGB / userUsage.MailboxAllocatedGB) * 100)}%`,
                    background: userUsage.MailboxUsedGB / userUsage.MailboxAllocatedGB > 0.9 ? '#F59E0B' : '#E4007D',
                    borderRadius: '3px',
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>
                  {Math.round((userUsage.MailboxUsedGB / userUsage.MailboxAllocatedGB) * 100)}% used
                </div>
              </>
            ) : (
              <div style={{ color: '#6B7280', fontSize: '13px' }}>No data available</div>
            )}
          </div>
        </div>
      )}

      {/* Issue Alert */}
      {user.IssueType && user.IssueType !== 'None' && (
        <div style={{
          margin: '24px 32px',
          padding: '16px 20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div>
            <div style={{ fontWeight: 600, color: '#EF4444' }}>Issue Detected: {user.IssueType}</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
              This user has been flagged for review. Consider optimising their licence assignment.
            </div>
          </div>
        </div>
      )}

      {/* Licences List */}
      <div className={styles.userLicencesList}>
        <div className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
          Assigned Licences ({licenceDetails.length})
        </div>
        {licenceDetails.length > 0 ? (
          licenceDetails.map((licence, index) => (
            <div key={index} className={styles.userLicenceItem}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontWeight: 600, color: '#F9FAFB' }}>{licence.name}</span>
                  {licence.classification && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 600,
                      background: getTierColour(licence.classification.tier),
                      color: '#fff'
                    }}>
                      {getTierLabel(licence.classification.tier)}
                    </span>
                  )}
                </div>
                {licence.sku && (
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    SKU: {licence.sku.SkuPartNumber}
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                {licence.monthlyCost > 0 ? (
                  <>
                    <div style={{ fontWeight: 600, color: '#E4007D' }}>
                      {'\u00A3'}{licence.monthlyCost.toFixed(2)}/mo
                    </div>
                    <div style={{ fontSize: '11px', color: '#6B7280' }}>
                      {'\u00A3'}{licence.annualCost.toFixed(2)}/yr
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '12px', color: '#6B7280' }}>
                    {licence.classification?.tier === 'free' || licence.classification?.tier === 'viral'
                      ? 'Free'
                      : 'No pricing data'}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ color: '#6B7280', fontStyle: 'italic' }}>
            No licences assigned to this user
          </div>
        )}
      </div>

      {/* Recommendations */}
      {user.IssueType && user.IssueType !== 'None' && (
        <div style={{ padding: '0 32px 24px' }}>
          <div className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
            Recommendations
          </div>
          <div className={styles.insightCard} style={{ borderLeftColor: '#E4007D' }}>
            <div className={styles.insightHeader}>
              <span className={styles.insightTitle}>Optimisation Opportunity</span>
            </div>
            <div className={styles.insightDescription}>
              {user.IssueType === 'Disabled' && 'This account is disabled but still has licences assigned. Consider removing the licences to reduce costs.'}
              {user.IssueType === 'Dual-Licensed' && 'This user has multiple licences assigned. Review whether all licences are necessary.'}
              {user.IssueType === 'Inactive 90+' && 'This user has not signed in for over 90 days. Consider whether the licence is still needed.'}
              {user.IssueType === 'Service Account' && 'This appears to be a service account. Verify it requires the assigned licences.'}
            </div>
            <div className={styles.insightAction}>
              <span className={styles.actionLabel}>Potential Savings:</span> {'\u00A3'}{totalAnnualCost.toLocaleString()}/year
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDetailPage;
