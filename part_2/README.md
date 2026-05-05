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
[Explain the AsyncGenerator and why interface not abstract class]

### Deduplication
[Explain the composite key platform + ad_id + date and INSERT OR IGNORE]

### Exponential Backoff
[Explain the formula base × 2^attempt + jitter and why each element exists]

### Why SQLite
[Explain immutability of ad data, zero setup, native INSERT OR IGNORE]

## Testing Strategy

[See the testing section below]

