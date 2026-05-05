import Database from 'better-sqlite3';
import type { AdMetric } from '../shared/types.js';
import type {
  AggregatedMetrics,
  MetricStore,
  PerformanceQuery,
  TopPerformingQuery,
  TopPerformingResult,
} from './types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS ad_metrics (
  id           TEXT    NOT NULL,
  platform     TEXT    NOT NULL,
  campaign_id  TEXT    NOT NULL,
  ad_id        TEXT    NOT NULL,
  date         TEXT    NOT NULL,
  impressions  INTEGER NOT NULL DEFAULT 0,
  clicks       INTEGER NOT NULL DEFAULT 0,
  spend        REAL    NOT NULL DEFAULT 0,
  revenue      REAL    NOT NULL DEFAULT 0,
  ctr          REAL    NOT NULL DEFAULT 0,
  cpc          REAL    NOT NULL DEFAULT 0,
  roas         REAL    NOT NULL DEFAULT 0,
  PRIMARY KEY (platform, ad_id, date)
);

CREATE INDEX IF NOT EXISTS idx_platform_date
  ON ad_metrics (platform, date);

CREATE INDEX IF NOT EXISTS idx_campaign
  ON ad_metrics (campaign_id);

CREATE INDEX IF NOT EXISTS idx_ctr   ON ad_metrics (ctr);
CREATE INDEX IF NOT EXISTS idx_cpc   ON ad_metrics (cpc);
CREATE INDEX IF NOT EXISTS idx_roas  ON ad_metrics (roas);
`;

function buildWhereClause(query: PerformanceQuery): {
  sql: string;
  params: Record<string, unknown>;
} {
  const parts: string[] = [];
  const params: Record<string, unknown> = {};

  if (query.platform !== undefined) {
    parts.push('platform = @platform');
    params.platform = query.platform;
  }
  if (query.dateFrom !== undefined) {
    parts.push('date >= @dateFrom');
    params.dateFrom = query.dateFrom;
  }
  if (query.dateTo !== undefined) {
    parts.push('date <= @dateTo');
    params.dateTo = query.dateTo;
  }
  if (query.campaignId !== undefined) {
    parts.push('campaign_id = @campaignId');
    params.campaignId = query.campaignId;
  }

  const sql = parts.length > 0 ? `WHERE ${parts.join(' AND ')}` : '';
  return { sql, params };
}

function rowToAdMetric(row: {
  id: string;
  platform: string;
  campaign_id: string;
  ad_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
  ctr: number;
  cpc: number;
  roas: number;
}): AdMetric {
  return {
    id: row.id,
    platform: row.platform as AdMetric['platform'],
    campaignId: row.campaign_id,
    adId: row.ad_id,
    date: row.date,
    impressions: row.impressions,
    clicks: row.clicks,
    spend: row.spend,
    revenue: row.revenue,
    ctr: row.ctr,
    cpc: row.cpc,
    roas: row.roas,
  };
}

export class SqliteMetricStore implements MetricStore {
  private constructor(private readonly db: Database.Database) {}

  static create(dbPath: string): SqliteMetricStore {
    const db = new Database(dbPath);
    db.exec(SCHEMA);
    return new SqliteMetricStore(db);
  }

  save(metrics: AdMetric[]): void {
    if (metrics.length === 0) return;

    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO ad_metrics (
        id, platform, campaign_id, ad_id, date,
        impressions, clicks, spend, revenue, ctr, cpc, roas
      ) VALUES (
        @id, @platform, @campaign_id, @ad_id, @date,
        @impressions, @clicks, @spend, @revenue, @ctr, @cpc, @roas
      )
    `);

    const run = this.db.transaction((rows: AdMetric[]) => {
      for (const m of rows) {
        insert.run({
          id: m.id,
          platform: m.platform,
          campaign_id: m.campaignId,
          ad_id: m.adId,
          date: m.date,
          impressions: m.impressions,
          clicks: m.clicks,
          spend: m.spend,
          revenue: m.revenue,
          ctr: m.ctr,
          cpc: m.cpc,
          roas: m.roas,
        });
      }
    });

    run(metrics);
  }

  findAggregated(query: PerformanceQuery): AggregatedMetrics {
    const { sql: whereSql, params } = buildWhereClause(query);

    const row = this.db
      .prepare(
        `
      SELECT
        COALESCE(SUM(impressions), 0) AS totalImpressions,
        COALESCE(SUM(clicks), 0) AS totalClicks,
        COALESCE(SUM(spend), 0) AS totalSpend,
        COALESCE(SUM(revenue), 0) AS totalRevenue,
        COALESCE(AVG(ctr), 0) AS averageCtr,
        COALESCE(AVG(cpc), 0) AS averageCpc,
        COALESCE(AVG(roas), 0) AS averageRoas,
        COUNT(*) AS recordCount
      FROM ad_metrics
      ${whereSql}
    `
      )
      .get(params) as {
      totalImpressions: number;
      totalClicks: number;
      totalSpend: number;
      totalRevenue: number;
      averageCtr: number;
      averageCpc: number;
      averageRoas: number;
      recordCount: number;
    };

    return {
      totalImpressions: row.totalImpressions,
      totalClicks: row.totalClicks,
      totalSpend: row.totalSpend,
      totalRevenue: row.totalRevenue,
      averageCtr: row.averageCtr,
      averageCpc: row.averageCpc,
      averageRoas: row.averageRoas,
      recordCount: row.recordCount,
    };
  }

  findTopPerforming(query: TopPerformingQuery): TopPerformingResult {
    const { sql: whereSql, params } = buildWhereClause(query);

    const countRow = this.db
      .prepare(`SELECT COUNT(*) AS c FROM ad_metrics ${whereSql}`)
      .get(params) as { c: number };

    const baseSql = `
      SELECT
        id, platform, campaign_id, ad_id, date,
        impressions, clicks, spend, revenue, ctr, cpc, roas
      FROM ad_metrics
      ${whereSql}
      ORDER BY
        CASE @metric
          WHEN 'ctr' THEN ctr
          WHEN 'cpc' THEN cpc
          WHEN 'roas' THEN roas
          WHEN 'clicks' THEN clicks
          WHEN 'revenue' THEN revenue
        END
    `;

    const sql =
      query.order === 'asc'
        ? `${baseSql} ASC LIMIT @limit`
        : `${baseSql} DESC LIMIT @limit`;

    const data = this.db
      .prepare(sql)
      .all({ ...params, metric: query.metric, limit: query.limit }) as Parameters<
      typeof rowToAdMetric
    >[0][];

    return {
      data: data.map(rowToAdMetric),
      total: countRow.c,
    };
  }

  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) AS c FROM ad_metrics').get() as {
      c: number;
    };
    return row.c;
  }
}
