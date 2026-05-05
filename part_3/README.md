# Part 3 — Query API Layer

The API server is implemented within the main `datads-pipeline` project.
Source code: `src/api/routes.ts`

## How to Run

```bash
# First, ensure data is ingested
npm run fetch

# Start the server
npm run dev
```

## Endpoints

### GET /api/performance

Returns aggregated metrics with optional filters.

```bash
# All platforms, all time
curl -s "http://localhost:3000/api/performance" | jq .

# Facebook only
curl -s "http://localhost:3000/api/performance?platform=facebook" | jq .

# Date range
curl -s "http://localhost:3000/api/performance?date_from=2026-04-01&date_to=2026-04-30" | jq .

# Specific campaign
curl -s "http://localhost:3000/api/performance?campaign_id=fb_camp_123" | jq .
```

### GET /api/top-performing

Returns top ads sorted by a specific metric.

```bash
# Top 5 by ROAS
curl -s "http://localhost:3000/api/top-performing?metric=roas&limit=5" | jq .

# Top 10 by CTR (default limit)
curl -s "http://localhost:3000/api/top-performing?metric=ctr" | jq .

# Bottom 5 by CPC (ascending)
curl -s "http://localhost:3000/api/top-performing?metric=cpc&order=asc&limit=5" | jq .

# Top 3 by revenue, Facebook only
curl -s "http://localhost:3000/api/top-performing?metric=revenue&limit=3&platform=facebook" | jq .
```

### Error Responses

```bash
# Missing required metric parameter → 400
curl -s "http://localhost:3000/api/top-performing" | jq .

# Invalid platform → 400
curl -s "http://localhost:3000/api/performance?platform=snapchat" | jq .

# Limit too high → 400
curl -s "http://localhost:3000/api/top-performing?metric=ctr&limit=200" | jq .
```

## Input Validation

| Parameter | Validation |
|-----------|-----------|
| `platform` | Must be `facebook`, `google`, or `tiktok` |
| `date_from` / `date_to` | Must match `YYYY-MM-DD` format |
| `metric` | Required. Must be `ctr`, `cpc`, `roas`, `clicks`, or `revenue` |
| `order` | Must be `asc` or `desc` (default: `desc`) |
| `limit` | Integer between 1 and 100 (default: 10) |

