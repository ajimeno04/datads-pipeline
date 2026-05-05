import type { AdMetric, Platform } from '../shared/types.js';

// Available filters for queries
export type PerformanceQuery = {
  platform?:   Platform;
  dateFrom?:   string;  // YYYY-MM-DD
  dateTo?:     string;  // YYYY-MM-DD
  campaignId?: string;
};

export type TopPerformingQuery = PerformanceQuery & {
  metric: 'ctr' | 'cpc' | 'roas' | 'clicks' | 'revenue';
  order:  'asc' | 'desc';
  limit:  number; // max 100
};

// Aggregated result for /api/performance
export type AggregatedMetrics = {
  totalImpressions: number;
  totalClicks:      number;
  totalSpend:       number;
  totalRevenue:     number;
  averageCtr:       number;
  averageCpc:       number;
  averageRoas:      number;
  recordCount:      number;
};

// Paginated result for /api/top-performing
export type TopPerformingResult = {
  data:  AdMetric[];
  total: number;
};

export interface MetricStore {
  // Saves a batch of metrics. Silently ignores duplicates (INSERT OR IGNORE).
  save(metrics: AdMetric[]): void;

  // Returns aggregated metrics according to the applied filters.
  findAggregated(query: PerformanceQuery): AggregatedMetrics;

  // Returns the top N ads ordered by the specified metric.
  findTopPerforming(query: TopPerformingQuery): TopPerformingResult;

  // Returns the total number of stored records. Useful to verify ingestion.
  count(): number;
}
