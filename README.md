# DatAds Take-Home Exercise

Ad metrics pipeline: ingests data from 3 advertising platforms (Facebook, Google, TikTok),
computes CTR/CPC/ROAS, stores in SQLite, and serves via REST API.

## Project Structure

```
├── part_1/                     # System Design (architecture diagram + decisions)
├── part_2/                     # Data Polling & Processing (implementation)
├── part_3/                     # Query API Layer (optional bonus)
└── datads-pipeline/            # Source code
    └── src/
        ├── providers/          # Platform adapters (Facebook, Google, TikTok)
        ├── services/           # Ingestion pipeline + metrics aggregation
        ├── storage/            # SQLite repository with dedup
        ├── api/                # Express routes with validation
        └── shared/             # HTTP client, types, config
```

## Quick Start

```bash
npm install
cp .env.example .env
npm run fetch          # Ingest last 30 days into SQLite
npm run dev            # Start API server on port 3000
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/performance` | Aggregated metrics with filters (platform, date_from, date_to, campaign_id) |
| `GET /api/top-performing` | Top ads by metric (ctr, cpc, roas, clicks, revenue) with limit and sort |

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | TypeScript compilation |
| `npm run fetch` | On-demand data ingestion (last 30 days) |
| `npm test` | Run test suite |

## AI Assistance

Claude (Anthropic) was used as a design thinking partner to debate architectural
tradeoffs and draft documentation. All decisions and code are my own.
