import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdMetric } from '../shared/types.js';
import { ResilienceHttpClient, PermanentError } from '../shared/http-client.js';
import { SqliteMetricStore } from '../storage/sqlite.js';

describe('createAdMetric', () => {
  it('calculates CTR as clicks / impressions', () => {
    const m = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 10000,
      clicks: 150,
      spend: 75.5,
      revenue: 360,
    });
    expect(m.ctr).toBeCloseTo(0.015, 10);
  });

  it('calculates CPC as spend / clicks', () => {
    const m = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 10000,
      clicks: 150,
      spend: 75.5,
      revenue: 360,
    });
    expect(m.cpc).toBeCloseTo(75.5 / 150, 10);
  });

  it('calculates ROAS as revenue / spend', () => {
    const m = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 10000,
      clicks: 150,
      spend: 75.5,
      revenue: 360,
    });
    expect(m.roas).toBeCloseTo(360 / 75.5, 10);
  });

  it('returns 0 for CTR when impressions is 0 (avoids division by zero)', () => {
    const m = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 0,
      clicks: 150,
      spend: 75.5,
      revenue: 360,
    });
    expect(m.ctr).toBe(0);
  });
});

function responseLike(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): {
  status: number;
  headers: { get(name: string): string | null };
  json(): Promise<unknown>;
} {
  return {
    status,
    headers: {
      get(name: string) {
        return headers[name] ?? headers[name.toLowerCase()] ?? null;
      },
    },
    async json() {
      return body;
    },
  };
}

describe('ResilienceHttpClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('retries up to maxRetries on HTTP 500', async () => {
    vi.useFakeTimers();
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0);

    const fetchMock = vi.fn().mockResolvedValue(responseLike(500, {}));
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const http = new ResilienceHttpClient();
    const p = http.get('https://example.test', {});
    const assertion = expect(p).rejects.toThrow();

    // baseDelay 500ms with exponential backoff (without jitter):
    // 500 + 1000 + 2000 + 4000 = 7500ms total scheduled waits
    await vi.advanceTimersByTimeAsync(8000);
    await assertion;

    // 1 initial attempt + 4 retries
    expect(fetchMock).toHaveBeenCalledTimes(5);

    randomSpy.mockRestore();
    vi.useRealTimers();
  });

  it('throws PermanentError immediately on HTTP 400 without retrying', async () => {
    const fetchMock = vi.fn().mockResolvedValue(responseLike(400, {}));
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const http = new ResilienceHttpClient();
    await expect(http.get('https://example.test', {})).rejects.toBeInstanceOf(
      PermanentError
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('waits Retry-After header on HTTP 429', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(responseLike(429, {}, { 'Retry-After': '1' }))
      .mockResolvedValueOnce(responseLike(200, { ok: true }));
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const http = new ResilienceHttpClient();
    const p = http.get<{ ok: boolean }>('https://example.test', {});

    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});

describe('SqliteMetricStore deduplication', () => {
  it('does not duplicate a record with the same (platform, ad_id, date)', () => {
    const store = SqliteMetricStore.create(':memory:');
    const m = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 10,
      clicks: 1,
      spend: 1,
      revenue: 2,
    });

    store.save([m]);
    store.save([m]);

    expect(store.count()).toBe(1);
  });

  it('does store records with a different date for the same ad_id', () => {
    const store = SqliteMetricStore.create(':memory:');
    const m1 = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-15',
      impressions: 10,
      clicks: 1,
      spend: 1,
      revenue: 2,
    });
    const m2 = createAdMetric({
      platform: 'facebook',
      campaignId: 'c1',
      adId: 'a1',
      date: '2025-01-16',
      impressions: 10,
      clicks: 1,
      spend: 1,
      revenue: 2,
    });

    store.save([m1, m2]);
    expect(store.count()).toBe(2);
  });
});

