import type { AdMetric } from '../shared/types.js';
import type { MetricStore, PerformanceQuery, TopPerformingQuery } from '../storage/types.js';

// Wrapper around store.findAggregated that formats the response
// exactly as the exercise specifies in the /api/performance endpoint schema
export function getPerformance(store: MetricStore, query: PerformanceQuery): {
  data: {
    total_impressions: number;
    total_clicks:      number;
    total_spend:       number;
    total_revenue:     number;
    average_ctr:       number;
    average_cpc:       number;
    average_roas:      number;
  };
  filters_applied: {
    platform?: string;
    date_from?: string;
    date_to?: string;
    campaign_id?: string;
  };
} {
  const agg = store.findAggregated(query);
  return {
    data: {
      total_impressions: agg.totalImpressions,
      total_clicks:      agg.totalClicks,
      total_spend:       agg.totalSpend,
      total_revenue:     agg.totalRevenue,
      average_ctr:       agg.averageCtr,
      average_cpc:       agg.averageCpc,
      average_roas:      agg.averageRoas,
    },
    filters_applied: {
      ...(query.platform ? { platform: query.platform } : {}),
      ...(query.dateFrom ? { date_from: query.dateFrom } : {}),
      ...(query.dateTo ? { date_to: query.dateTo } : {}),
      ...(query.campaignId ? { campaign_id: query.campaignId } : {}),
    },
  };
}

// Wrapper around store.findTopPerforming that formats the response
// exactly as the exercise specifies in the /api/top-performing endpoint schema
export function getTopPerforming(store: MetricStore, query: TopPerformingQuery): {
  data: Array<{
    ad_id: string;
    campaign_id: string;
    platform: AdMetric['platform'];
    date: string;
    impressions: number;
    clicks: number;
    spend: number;
    revenue: number;
    ctr: number;
    cpc: number;
    roas: number;
  }>;
  pagination: { limit: number; total: number };
} {
  const result = store.findTopPerforming(query);
  return {
    data: result.data.map((m) => ({
      ad_id: m.adId,
      campaign_id: m.campaignId,
      platform: m.platform,
      date: m.date,
      impressions: m.impressions,
      clicks: m.clicks,
      spend: m.spend,
      revenue: m.revenue,
      ctr: m.ctr,
      cpc: m.cpc,
      roas: m.roas,
    })),
    pagination: { limit: query.limit, total: result.total },
  };
}
