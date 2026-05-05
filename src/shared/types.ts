// The system key: an ad on a platform on a specific day.
// This combination is UNIQUE — it serves as the deduplication key.

export type Platform = 'facebook' | 'google' | 'tiktok';

// Canonical model: what we store in SQLite regardless of the source platform.
// The three derived metrics (ctr, cpc, roas) are calculated ONLY ONCE in ingestion.
// They are never recalculated at query time because ad data is immutable once written.
export type AdMetric = {
  readonly id: string;          // SHA of (platform + ad_id + date) — dedup key
  readonly platform: Platform;
  readonly campaignId: string;
  readonly adId: string;
  readonly date: string;        // YYYY-MM-DD always as string, not Date
  readonly impressions: number;
  readonly clicks: number;
  readonly spend: number;
  readonly revenue: number;
  readonly ctr: number;         // clicks / impressions — 0 if impressions is 0
  readonly cpc: number;         // spend / clicks — 0 if clicks is 0
  readonly roas: number;        // revenue / spend — 0 if spend is 0
};

// Factory function: builds a complete AdMetric from raw data.
// Prevents derived fields from being calculated in multiple places.
export function createAdMetric(
  raw: Omit<AdMetric, 'id' | 'ctr' | 'cpc' | 'roas'>
): AdMetric {
  return {
    ...raw,
    id: buildId(raw.platform, raw.adId, raw.date),
    ctr:  raw.impressions > 0 ? raw.clicks / raw.impressions : 0,
    cpc:  raw.clicks > 0      ? raw.spend  / raw.clicks      : 0,
    roas: raw.spend > 0       ? raw.revenue / raw.spend      : 0,
  };
}

function buildId(platform: string, adId: string, date: string): string {
  // In production we'd use crypto.createHash. For the exercise, concatenation is enough.
  return `${platform}:${adId}:${date}`;
}

// Value object for date ranges — validates that from <= to at construction time.
export type DateRange = {
  readonly from: string; // YYYY-MM-DD
  readonly to: string;   // YYYY-MM-DD
};

export function createDateRange(from: string, to: string): DateRange {
  if (from > to) throw new Error(`Invalid DateRange: ${from} > ${to}`);
  return { from, to };
}

export function lastNDays(n: number): DateRange {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - n);
  return {
    from: toISODate(from),
    to:   toISODate(to),
  };
}

function toISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}
