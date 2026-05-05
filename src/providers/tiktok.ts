import type { ResilienceHttpClient } from '../shared/http-client.js';
import {
  createAdMetric,
  type AdMetric,
  type DateRange,
  type Platform,
} from '../shared/types.js';
import { config } from '../shared/config.js';
import { logger } from '../shared/logger.js';
import type { PlatformProvider } from './types.js';

type TikTokPerformanceRow = {
  campaign: {
    id: string;
    ad_id: string;
  };
  performance: {
    date: string;
    views: number;
    engagements: number;
    budget_spent: number;
    purchase_value: number;
  };
};

type TikTokPerformanceResponse = {
  performance_data: TikTokPerformanceRow[];
  has_more: boolean;
  offset: number;
};

export class TikTokProvider implements PlatformProvider {
  readonly platform: Platform = 'tiktok';

  constructor(private readonly http: ResilienceHttpClient) {}

  async *fetchMetrics(range: DateRange): AsyncGenerator<AdMetric[]> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.tiktok.apiToken}`,
    };

    let offset = 0;

    for (;;) {
      const url = new URL(`${config.api.baseUrl}/v1/ad/performance`);
      url.searchParams.set('date_from', range.from);
      url.searchParams.set('date_to', range.to);
      url.searchParams.set('offset', String(offset));
      url.searchParams.set('limit', '25');

      let body: TikTokPerformanceResponse;
      try {
        body = await this.http.get<TikTokPerformanceResponse>(url.toString(), headers);
      } catch (err) {
        logger.error('TikTok provider request failed', {
          url: url.toString(),
          error: String(err),
        });
        throw err;
      }

      if (!body || !Array.isArray((body as { performance_data?: unknown }).performance_data)) {
        logger.error('TikTok provider received unexpected payload shape', {
          url: url.toString(),
          payload: body as unknown,
        });
        throw new Error(`Unexpected TikTok API response shape for ${url.toString()}`);
      }

      const page = body.performance_data.map((row) =>
        createAdMetric({
          platform: 'tiktok',
          campaignId: row.campaign.id,
          adId: row.campaign.ad_id,
          date: row.performance.date,
          impressions: row.performance.views,
          clicks: row.performance.engagements,
          spend: row.performance.budget_spent,
          revenue: row.performance.purchase_value,
        })
      );

      if (page.length > 0) {
        yield page;
      }

      if (!body.has_more) break;
      offset = body.offset;
    }
  }
}
