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

type GoogleReportRow = {
  campaignId: string;
  adGroupId: string;
  adId: string;
  date: string;
  metrics: {
    impressions: number;
    clicks: number;
    cost: number;
    conversions: number;
    conversionValue: number;
  };
};

type GoogleReportsResponse = {
  reports: GoogleReportRow[];
  nextPageToken?: string | null;
};

export class GoogleProvider implements PlatformProvider {
  readonly platform: Platform = 'google';

  constructor(private readonly http: ResilienceHttpClient) {}

  async *fetchMetrics(range: DateRange): AsyncGenerator<AdMetric[]> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${config.google.apiToken}`,
    };

    let pageToken: string | undefined;

    for (;;) {
      const url = new URL(`${MOCK_BASE}/api/reports/campaigns`);
      url.searchParams.set('start_date', range.from);
      url.searchParams.set('end_date', range.to);
      url.searchParams.set('page_size', '50');
      if (pageToken) url.searchParams.set('page_token', pageToken);

      let body: GoogleReportsResponse;
      try {
        body = await this.http.get<GoogleReportsResponse>(url.toString(), headers);
      } catch (err) {
        logger.error('Google provider request failed', {
          url: url.toString(),
          error: String(err),
        });
        throw err;
      }

      if (!body || !Array.isArray((body as { reports?: unknown }).reports)) {
        logger.error('Google provider received unexpected payload shape', {
          url: url.toString(),
          payload: body as unknown,
        });
        throw new Error(`Unexpected Google API response shape for ${url.toString()}`);
      }

      const page = body.reports.map((row) =>
        createAdMetric({
          platform: 'google',
          campaignId: row.campaignId,
          adId: row.adId,
          date: row.date,
          impressions: row.metrics.impressions,
          clicks: row.metrics.clicks,
          spend: row.metrics.cost,
          revenue: row.metrics.conversionValue,
        })
      );

      if (page.length > 0) {
        yield page;
      }

      const next = body.nextPageToken;
      if (next == null || next === '') break;
      pageToken = next;
    }
  }
}
