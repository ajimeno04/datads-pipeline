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
  filters_applied: PerformanceQuery;
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
    filters_applied: query,
  };
}

// Wrapper around store.findTopPerforming that formats the response
// exactly as the exercise specifies in the /api/top-performing endpoint schema
export function getTopPerforming(store: MetricStore, query: TopPerformingQuery): {
  data:       AdMetric[];
  pagination: { limit: number; total: number };
} {
  const result = store.findTopPerforming(query);
  return {
    data:       result.data,
    pagination: { limit: query.limit, total: result.total },
  };
}
