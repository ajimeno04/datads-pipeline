# Part 2 — Data Polling and Processing

## How to Run

### Prerequisites
- Node.js 20+
- npm

### Setup
```bash
cd datads-pipeline
npm install
cp .env.example .env   # credentials already filled in .env.example for this exercise
```

### Fetch data (Last 30 days — Facebook)
```bash
npm run fetch
```

### Start API server
```bash
npm run dev
```

## Sample Output

### Fetch logs (`npm run fetch`)

See `part_2/sample_output.txt`.

### API responses

#### Aggregated Facebook metrics

```json
{
  "data": {
    "total_impressions": 5260590,
    "total_clicks": 55872,
    "total_spend": 21904.03,
    "total_revenue": 103115.73,
    "average_ctr": 0.014838050246519588,
    "average_cpc": 0.5613157803603723,
    "average_roas": 6.668550357587267
  },
  "filters_applied": {
    "platform": "facebook"
  }
}
```

#### Top 5 ads by ROAS

```json
{
  "data": [
    {
      "id": "google:goog_ad_666:2026-04-06",
      "platform": "google",
      "campaignId": "goog_camp_27",
      "adId": "goog_ad_666",
      "date": "2026-04-06",
      "impressions": 21233,
      "clicks": 265,
      "spend": 18.82,
      "revenue": 809.22,
      "ctr": 0.012480572693448877,
      "cpc": 0.0710188679245283,
      "roas": 42.99787460148778
    },
    {
      "id": "google:goog_ad_147:2026-04-10",
      "platform": "google",
      "campaignId": "goog_camp_0",
      "adId": "goog_ad_147",
      "date": "2026-04-10",
      "impressions": 17201,
      "clicks": 95,
      "spend": 19.23,
      "revenue": 655.38,
      "ctr": 0.0055229347130980756,
      "cpc": 0.20242105263157895,
      "roas": 34.0811232449298
    },
    {
      "id": "facebook:fb_ad_224:2026-04-27",
      "platform": "facebook",
      "campaignId": "fb_camp_123",
      "adId": "fb_ad_224",
      "date": "2026-04-27",
      "impressions": 18982,
      "clicks": 169,
      "spend": 23.76,
      "revenue": 711.65,
      "ctr": 0.008903171425561058,
      "cpc": 0.14059171597633138,
      "roas": 29.951599326599325
    },
    {
      "id": "facebook:fb_ad_58:2026-04-28",
      "platform": "facebook",
      "campaignId": "fb_camp_123",
      "adId": "fb_ad_58",
      "date": "2026-04-28",
      "impressions": 32107,
      "clicks": 258,
      "spend": 34.99,
      "revenue": 989.19,
      "ctr": 0.008035630859314169,
      "cpc": 0.1356201550387597,
      "roas": 28.270648756787654
    },
    {
      "id": "facebook:fb_ad_424:2026-04-23",
      "platform": "facebook",
      "campaignId": "fb_camp_123",
      "adId": "fb_ad_424",
      "date": "2026-04-23",
      "impressions": 43913,
      "clicks": 261,
      "spend": 33.16,
      "revenue": 894.54,
      "ctr": 0.005943570241158654,
      "cpc": 0.12704980842911875,
      "roas": 26.976477683956578
    }
  ],
  "pagination": {
    "limit": 5,
    "total": 300
  }
}
```

#### Top 3 ads by CTR in date range (2025-01-01 to 2025-01-31)

```json
{
  "data": [],
  "pagination": {
    "limit": 3,
    "total": 0
  }
}
```

## Architecture Decisions

### Provider Pattern
Each ad platform has a different API contract: Facebook uses cursor-based pagination,
Google uses opaque page tokens, and TikTok uses numeric offset. Instead of handling
these differences with conditionals in the ingestion logic, each platform implements
the `PlatformProvider` interface with a single method: `fetchMetrics()`.

This method returns an `AsyncGenerator<AdMetric[]>` — each `yield` delivers one page of
normalized metrics. The ingestion service consumes pages one at a time without knowing
anything about pagination mechanics. Adding a new platform means creating a single file
that implements the interface — zero changes to existing code.

We use an `interface` instead of an `abstract class` because the three platforms share
a contract (what they deliver) but not an implementation (how they paginate). A template
method pattern would force artificial hooks to accommodate differences that are better
expressed as independent implementations.

### Deduplication
The same data may be fetched multiple times (overlapping date ranges, retried jobs,
scheduler re-runs). Without deduplication, aggregated metrics would be inflated.

The natural deduplication key is `(platform, ad_id, date)` — one ad on one platform on
one day produces exactly one set of metrics. This composite key is the PRIMARY KEY in
SQLite, and inserts use `INSERT OR IGNORE` so duplicates are silently discarded at the
database level without requiring application-side lookups.

### Exponential Backoff
All three APIs return random HTTP 500 errors 5% of the time. The retry strategy uses
exponential backoff: `delay = 500ms × 2^attempt + random(0-200ms)`, capped at 30 seconds,
with a maximum of 4 retries.

The jitter (random component) prevents thundering herd: if multiple providers fail
simultaneously, they retry at slightly different times instead of hammering the API
in synchronized bursts.

HTTP 429 (rate limit) is handled separately — the client reads the `Retry-After` header
and waits the exact duration the server requests.

### Why SQLite
Ad performance metrics are immutable once written — yesterday's clicks don't change today.
This means we can pre-compute CTR, CPC, and ROAS during ingestion and never recalculate
at query time. SQLite provides zero-setup persistence with native `INSERT OR IGNORE`
support for deduplication. For the exercise scope (3 platforms × 30 days × hundreds of ads),
SQLite handles both the write and read paths without bottleneck.

## Testing Strategy

### Implemented Tests

Unit tests covering three critical areas (run with `npm test`):

1. **Metric calculation** (`createAdMetric`): verifies CTR, CPC, ROAS formulas and
   division-by-zero edge cases
2. **Retry logic** (`ResilienceHttpClient`): confirms exponential backoff on 500,
   immediate failure on 400, and Retry-After compliance on 429
3. **Deduplication** (`SqliteMetricStore`): confirms INSERT OR IGNORE behavior with
   same and different composite keys

### What I Would Add With More Time

- **Integration tests**: spin up the Express server, run ingestion against the real
  mock API, and verify end-to-end that `/api/performance` returns correct aggregates
- **Provider contract tests**: mock the HTTP client and verify each provider correctly
  maps platform-specific field names to the canonical model
- **Edge case coverage**: empty API responses, malformed JSON, network timeouts,
  concurrent ingestion runs

