import * as React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { SPHttpClient } from '@microsoft/sp-http';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import styles from './CostManagementDashboard.module.scss';

export interface ICostManagementDashboardProps {
  spHttpClient: SPHttpClient;
  siteUrl: string;
}

interface ICostSummaryItem {
  Title: string;
  ReportMonth: string;
  EffectiveCost: number;
  BilledCost: number;
  CommitmentSavings: number;
  NegotiatedSavings: number;
  TotalSavings: number;
  EffectiveSavingsRate: number;
  TopSubscription: string;
  TopSubscriptionCost: number;
  TopService: string;
  TopServiceCost: number;
  SubscriptionBreakdown: string;
  ServiceBreakdown: string;
  PreviousMonthCost: number;
  MoMChange: number;
  ReportUrl: { Url: string; Description: string } | null;
}

interface IBreakdownEntry {
  name: string;
  cost: number;
}

const FOCUS_REPORTS_URL = 'https://lebara.sharepoint.com/:f:/r/sites/InfrastructureV2/Shared%20Documents/Cost%20Management/FOCUSCostReports';
const AZURE_COST_URL = 'https://portal.azure.com/#blade/Microsoft_Azure_CostManagement';

function parseBreakdownJson(raw: string | null | undefined): IBreakdownEntry[] {
  if (!raw) return [];
  try {
    var parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (_e) { /* ignore */ }
  return [];
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return '\u00A3' + (value / 1000000).toFixed(1) + 'M';
  }
  if (value >= 1000) {
    return '\u00A3' + (value / 1000).toFixed(1) + 'K';
  }
  return '\u00A3' + value.toFixed(0);
}

function formatCurrencyFull(value: number): string {
  // ES5-safe: manual thousands formatting
  var rounded = value.toFixed(2);
  var parts = rounded.split('.');
  var intPart = parts[0];
  var decPart = parts[1];
  var result = '';
  var count = 0;
  for (var i = intPart.length - 1; i >= 0; i--) {
    if (count > 0 && count % 3 === 0) {
      result = ',' + result;
    }
    result = intPart[i] + result;
    count++;
  }
  return '\u00A3' + result + '.' + decPart;
}

function formatMonthLabel(title: string): string {
  // Title is "YYYY-MM", return "MMM YY"
  var parts = title.split('-');
  if (parts.length < 2) return title;
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var monthIndex = parseInt(parts[1], 10) - 1;
  if (monthIndex < 0 || monthIndex > 11) return title;
  return months[monthIndex] + ' ' + parts[0].slice(2);
}

export const CostManagementDashboard: React.FC<ICostManagementDashboardProps> = (props) => {
  const { spHttpClient, siteUrl } = props;
  const [items, setItems] = useState<ICostSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!spHttpClient || !siteUrl) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    var apiUrl = siteUrl + "/_api/web/lists/getbytitle('CloudCostSummary')/items?$orderby=ReportMonth desc&$top=12";

    spHttpClient.get(apiUrl, SPHttpClient.configurations.v1)
      .then(function(response) {
        if (!response.ok) {
          throw new Error('Failed to load cost data (HTTP ' + response.status + ')');
        }
        return response.json();
      })
      .then(function(data) {
        setItems(data.value || []);
        setLoading(false);
      })
      .catch(function(err) {
        console.error('CostManagementDashboard fetch error:', err);
        setError(err.message || 'Failed to load cost data');
        setLoading(false);
      });
  }, [spHttpClient, siteUrl]);

  useEffect(function() {
    fetchData();
  }, [fetchData]);

  // Loading
  if (loading) {
    return (
      <div className={styles.costDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>{'💰'}</span>
              Cost Management
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.loadingContainer}>
              <div className={styles.shimmerRow}>
                <div className={styles.shimmer} />
                <div className={styles.shimmer} />
                <div className={styles.shimmer} />
                <div className={styles.shimmer} />
              </div>
              <div className={styles.shimmerWide} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className={styles.costDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>{'💰'}</span>
              Cost Management
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.errorState}>
              <div className={styles.errorIcon}>{'⚠️'}</div>
              <div className={styles.errorMessage}>{error}</div>
              <button className={styles.retryButton} onClick={fetchData}>
                {'🔄'} Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty
  if (items.length === 0) {
    return (
      <div className={styles.costDashboard}>
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.icon}>{'💰'}</span>
              Cost Management
            </h2>
          </div>
          <div className={styles.sectionContent}>
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{'📊'}</div>
              <div className={styles.emptyMessage}>No cost data available.</div>
              <div className={styles.emptyHint}>Run Import-FOCUSCostData.ps1 to populate cost metrics.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Data available
  var current = items[0];
  var services = parseBreakdownJson(current.ServiceBreakdown).slice(0, 7);
  var subscriptions = parseBreakdownJson(current.SubscriptionBreakdown);
  var maxServiceCost = services.length > 0 ? services[0].cost : 1;
  var totalCost = current.EffectiveCost || 1;

  // Trend data (reverse for chronological order)
  var trendData: Array<{ month: string; cost: number }> = [];
  for (var i = items.length - 1; i >= 0; i--) {
    trendData.push({
      month: formatMonthLabel(items[i].Title),
      cost: Math.round(items[i].EffectiveCost)
    });
  }

  // ESR colour class
  var esrClass = styles.kpiEsrRed;
  var esrValueClass = styles.kpiValueRed;
  if (current.EffectiveSavingsRate >= 5) {
    esrClass = styles.kpiEsrGreen;
    esrValueClass = styles.kpiValueGreen;
  } else if (current.EffectiveSavingsRate >= 2) {
    esrClass = styles.kpiEsrAmber;
    esrValueClass = styles.kpiValueAmber;
  }

  // MoM colour class
  var momClass = styles.kpiMomGreen;
  var momValueClass = styles.kpiValueGreen;
  var momArrow = '\u2193'; // down arrow
  if (current.MoMChange > 0) {
    momClass = styles.kpiMomRed;
    momValueClass = styles.kpiValueRed;
    momArrow = '\u2191'; // up arrow
  }

  // Month label for subtitle
  var monthLabel = formatMonthLabel(current.Title);

  // Custom tooltip for light theme
  var CustomTooltip: React.FC<{
    active?: boolean;
    payload?: Array<{ value: number }>;
    label?: string;
  }> = function(tooltipProps) {
    if (tooltipProps.active && tooltipProps.payload && tooltipProps.payload.length) {
      return (
        <div style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '10px 14px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: '#333', fontSize: 13 }}>
            {tooltipProps.label}
          </div>
          <div style={{ color: '#0078D4', fontWeight: 600, fontSize: 13 }}>
            {formatCurrencyFull(tooltipProps.payload[0].value)}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={styles.costDashboard}>
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <span className={styles.icon}>{'💰'}</span>
            Cost Management
          </h2>
          <a href={AZURE_COST_URL} target="_blank" rel="noopener noreferrer" className={styles.sectionAction}>
            Open Azure Cost Management {'\u2192'}
          </a>
        </div>
        <div className={styles.sectionContent}>
          {/* Row 1: KPI Cards */}
          <div className={styles.kpiRow}>
            <div className={styles.kpiCard + ' ' + styles.kpiCost}>
              <div className={styles.kpiValue + ' ' + styles.kpiValueBlue}>
                {formatCurrency(current.EffectiveCost)}
              </div>
              <div className={styles.kpiSubtitle}>{monthLabel} spend</div>
            </div>
            <div className={styles.kpiCard + ' ' + styles.kpiSavings}>
              <div className={styles.kpiValue + ' ' + styles.kpiValueGreen}>
                {formatCurrency(current.TotalSavings)}
              </div>
              <div className={styles.kpiSubtitle}>Commitment + negotiated</div>
            </div>
            <div className={styles.kpiCard + ' ' + esrClass}>
              <div className={styles.kpiValue + ' ' + esrValueClass}>
                {current.EffectiveSavingsRate.toFixed(1)}%
              </div>
              <div className={styles.kpiSubtitle}>Effective Savings Rate</div>
            </div>
            <div className={styles.kpiCard + ' ' + momClass}>
              <div className={styles.kpiValue + ' ' + momValueClass}>
                {current.MoMChange != null ? (momArrow + ' ' + Math.abs(current.MoMChange).toFixed(1) + '%') : 'N/A'}
              </div>
              <div className={styles.kpiSubtitle}>vs previous month</div>
            </div>
          </div>

          {/* Row 2: Charts */}
          <div className={styles.chartsRow}>
            {/* Monthly Spend Trend */}
            <div className={styles.chartTrend}>
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Monthly Spend Trend</div>
                {trendData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="month"
                        stroke="#9CA3AF"
                        tick={{ fill: '#666', fontSize: 11 }}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        tick={{ fill: '#666', fontSize: 11 }}
                        tickFormatter={formatCurrency}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="cost" fill="#0078D4" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign: 'center', padding: 40, color: '#999', fontSize: 13 }}>
                    Trend data requires at least 2 months of data.
                  </div>
                )}
              </div>
            </div>

            {/* Top Services */}
            <div className={styles.chartServices}>
              <div className={styles.chartCard}>
                <div className={styles.chartTitle}>Top Services</div>
                {services.length > 0 ? (
                  <div>
                    {services.map(function(svc, idx) {
                      var pct = maxServiceCost > 0 ? (svc.cost / maxServiceCost) * 100 : 0;
                      return (
                        <div key={idx} className={styles.serviceItem}>
                          <div className={styles.serviceName} title={svc.name}>{svc.name}</div>
                          <div className={styles.serviceBarContainer}>
                            <div className={styles.serviceBarFill} style={{ width: pct + '%' }} />
                          </div>
                          <div className={styles.serviceCost}>{formatCurrency(svc.cost)}</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: 20, color: '#999', fontSize: 13 }}>
                    No service data available.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Subscription Breakdown Table */}
          {subscriptions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div className={styles.chartTitle}>Subscription Breakdown</div>
              <div className={styles.subTable}>
                <div className={styles.subTableHeader}>
                  <span>Subscription</span>
                  <span style={{ textAlign: 'right' }}>Monthly Cost</span>
                  <span>% of Total</span>
                </div>
                {subscriptions.map(function(sub, idx) {
                  var pct = totalCost > 0 ? (sub.cost / totalCost) * 100 : 0;
                  var rowClass = styles.subTableRow + (idx === 0 ? ' ' + styles.subTableRowTop : '');
                  return (
                    <div key={idx} className={rowClass}>
                      <div className={styles.subName} title={sub.name}>{sub.name}</div>
                      <div className={styles.subCost}>{formatCurrencyFull(sub.cost)}</div>
                      <div className={styles.subPctContainer}>
                        <div className={styles.subPctBar}>
                          <div className={styles.subPctFill} style={{ width: Math.min(pct, 100) + '%' }} />
                        </div>
                        <span className={styles.subPctLabel}>{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 4: CTA Row */}
          <div className={styles.ctaRow}>
            <a
              href={FOCUS_REPORTS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton}
            >
              {'📄'} View Full Report
            </a>
            <a
              href={AZURE_COST_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaButton + ' ' + styles.ctaButtonSecondary}
            >
              {'☁️'} Open Cost Management
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostManagementDashboard;
