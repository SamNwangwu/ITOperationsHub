import * as React from 'react';
import styles from '../LicenseManagement.module.scss';
import { ILicenceUser } from '../../models/ILicenceData';

export interface IDataTableColumn {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (user: ILicenceUser) => React.ReactNode;
}

export interface IDataTableProps {
  users: ILicenceUser[];
  columns: IDataTableColumn[];
  selectedIds?: Set<number>;
  onSelectionChange?: (ids: Set<number>) => void;
  onSort?: (field: string, direction: 'asc' | 'desc') => void;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  onRowClick?: (user: ILicenceUser) => void;
  emptyMessage?: string;
}

/**
 * Data Table component for displaying user lists
 * Supports selection, sorting, and custom rendering
 */
const DataTable: React.FC<IDataTableProps> = ({
  users,
  columns,
  selectedIds = new Set(),
  onSelectionChange,
  onSort,
  sortField,
  sortDirection = 'asc',
  onRowClick,
  emptyMessage = 'No users found'
}) => {
  const handleSelectAll = (): void => {
    if (!onSelectionChange) return;
    if (selectedIds.size === users.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(users.map(u => u.Id)));
    }
  };

  const handleSelectRow = (userId: number): void => {
    if (!onSelectionChange) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    onSelectionChange(newSelected);
  };

  const handleSort = (field: string): void => {
    if (!onSort) return;
    const newDirection = sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
    onSort(field, newDirection);
  };

  const getSortIcon = (field: string): string => {
    if (sortField !== field) return '\u21C5'; // Up-down arrow
    return sortDirection === 'asc' ? '\u2191' : '\u2193';
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatLastSignIn = (dateStr: string | null, daysSince: number): string => {
    if (!dateStr || daysSince >= 9999) return 'Never';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const renderCellContent = (user: ILicenceUser, column: IDataTableColumn): React.ReactNode => {
    if (column.render) {
      return column.render(user);
    }

    // Default renderers
    switch (column.key) {
      case 'user':
        return (
          <div className={styles.userCell}>
            <div className={styles.userAvatar}>{getInitials(user.Title)}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{user.Title}</div>
              <div className={styles.userEmail}>{user.UserPrincipalName}</div>
            </div>
          </div>
        );

      case 'licences':
        return (
          <div className={styles.licencePills}>
            {user.HasE5 && <span className={`${styles.licencePill} ${styles.pillE5}`}>E5</span>}
            {user.HasE3 && <span className={`${styles.licencePill} ${styles.pillE3}`}>E3</span>}
            {user.LicenceCount > 2 && (
              <span className={styles.moreCount}>+{user.LicenceCount - 2}</span>
            )}
          </div>
        );

      case 'status':
        return (
          <span className={`${styles.statusBadge} ${user.AccountEnabled ? styles.statusActive : styles.statusDisabled}`}>
            {user.AccountEnabled ? 'Active' : 'Disabled'}
          </span>
        );

      case 'issueType':
        if (user.IssueType === 'None') return '-';
        return (
          <span className={`${styles.issueBadge} ${styles[`issue${user.IssueType.replace(/\s+/g, '')}`]}`}>
            {user.IssueType}
          </span>
        );

      case 'lastSignIn':
        return (
          <span className={user.DaysSinceSignIn > 90 ? styles.textWarning : ''}>
            {formatLastSignIn(user.LastSignInDate, user.DaysSinceSignIn)}
          </span>
        );

      case 'department':
        return user.Department || '-';

      case 'jobTitle':
        return user.JobTitle || '-';

      default:
        return (user as Record<string, unknown>)[column.key]?.toString() || '-';
    }
  };

  return (
    <div className={styles.tableContainer}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            {onSelectionChange && (
              <th className={styles.checkboxCol}>
                <input
                  type="checkbox"
                  checked={selectedIds.size === users.length && users.length > 0}
                  onChange={handleSelectAll}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={col.sortable ? styles.sortable : undefined}
                onClick={col.sortable ? () => handleSort(col.key) : undefined}
              >
                {col.header}
                {col.sortable && <span className={styles.sortIcon}>{getSortIcon(col.key)}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onSelectionChange ? 1 : 0)} className={styles.emptyState}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            users.map(user => (
              <tr
                key={user.Id}
                className={`${selectedIds.has(user.Id) ? styles.selected : ''} ${onRowClick ? styles.clickable : ''}`}
                onClick={onRowClick ? () => onRowClick(user) : undefined}
              >
                {onSelectionChange && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.Id)}
                      onChange={() => handleSelectRow(user.Id)}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key}>{renderCellContent(user, col)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DataTable;
