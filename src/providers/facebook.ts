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

const MOCK_BASE =
  'https://datads-mock-ad-apis.happygrass-47d99234.germanywestcentral.azurecontainerapps.io';

const CAMPAIGN_IDS = ['fb_camp_123', 'fb_camp_456', 'fb_camp_789'] as const;

type FacebookInsightRow = {
  campaign_id: string;
  ad_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  revenue: number;
};

type FacebookInsightsResponse = {
  data: FacebookInsightRow[];
  paging?: { next?: string };
};

export class FacebookProvider implements PlatformProvider {
  readonly platform: Platform = 'facebook';

  constructor(private readonly http: ResilienceHttpClient) {}

  async *fetchMetrics(range: DateRange): AsyncGenerator<AdMetric[]> {
    const headers: Record<string, string> = {
      'x-api-key': config.facebook.apiKey,
    };

    for (const campaignId of CAMPAIGN_IDS) {
      let after: string | undefined;

      for (;;) {
        const url = new URL(
          `${MOCK_BASE}/api/v1/campaigns/${campaignId}/insights`
        );
        url.searchParams.set('since', range.from);
        url.searchParams.set('until', range.to);
        url.searchParams.set('limit', '100');
        if (after) url.searchParams.set('after', after);

        let body: FacebookInsightsResponse;
        try {
          body = await this.http.get<FacebookInsightsResponse>(
            url.toString(),
            headers
          );
        } catch (err) {
          logger.error('Facebook provider request failed', {
            url: url.toString(),
            error: String(err),
          });
          throw err;
        }

        if (!body || !Array.isArray((body as { data?: unknown }).data)) {
          logger.error('Facebook provider received unexpected payload shape', {
            url: url.toString(),
            payload: body as unknown,
          });
          throw new Error(`Unexpected Facebook API response shape for ${url.toString()}`);
        }

        const page = body.data.map((row) =>
          createAdMetric({
            platform: 'facebook',
            campaignId: row.campaign_id,
            adId: row.ad_id,
            date: row.date,
            impressions: row.impressions,
            clicks: row.clicks,
            spend: row.spend,
            revenue: row.revenue,
          })
        );

        if (page.length > 0) {
          yield page;
        }

        const next = body.paging?.next;
        if (!next) break;
        after = next;
      }
    }
  }
}
