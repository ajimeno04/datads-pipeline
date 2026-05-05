import type { Express, NextFunction, Request, Response } from 'express';
import { getPerformance, getTopPerforming } from '../services/metrics.js';
import type { MetricStore, PerformanceQuery, TopPerformingQuery } from '../storage/types.js';

const VALID_PLATFORMS = ['facebook', 'google', 'tiktok'] as const;
const PLATFORMS = new Set<string>(VALID_PLATFORMS);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_METRICS = ['ctr', 'cpc', 'roas', 'clicks', 'revenue'] as const;
const METRICS = new Set<string>(VALID_METRICS);

function singleQuery(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === 'string' ? first : undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

function parsePerformanceFilters(req: Request): {
  ok: true;
  query: PerformanceQuery;
} | { ok: false; status: number; message: string } {
  const platform = singleQuery(req.query.platform);
  const date_from = singleQuery(req.query.date_from);
  const date_to = singleQuery(req.query.date_to);
  const campaign_id = singleQuery(req.query.campaign_id);

  if (platform !== undefined && !PLATFORMS.has(platform)) {
    return {
      ok: false,
      status: 400,
      message: "invalid platform: must be 'facebook', 'google', or 'tiktok'",
    };
  }
  if (date_from !== undefined && !ISO_DATE.test(date_from)) {
    return {
      ok: false,
      status: 400,
      message: 'date_from must have format YYYY-MM-DD',
    };
  }
  if (date_to !== undefined && !ISO_DATE.test(date_to)) {
    return {
      ok: false,
      status: 400,
      message: 'date_to must have format YYYY-MM-DD',
    };
  }

  const query: PerformanceQuery = {};
  if (platform !== undefined) {
    query.platform = platform as PerformanceQuery['platform'];
  }
  if (date_from !== undefined) query.dateFrom = date_from;
  if (date_to !== undefined) query.dateTo = date_to;
  if (campaign_id !== undefined) query.campaignId = campaign_id;

  return { ok: true, query };
}

export function registerRoutes(app: Express, store: MetricStore): void {
  app.get('/api/performance', (req: Request, res: Response) => {
    try {
      const parsed = parsePerformanceFilters(req);
      if (!parsed.ok) {
        res.status(parsed.status).json({ error: parsed.message });
        return;
      }
      res.status(200).json(getPerformance(store, parsed.query));
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.get('/api/top-performing', (req: Request, res: Response) => {
    try {
      const metric = singleQuery(req.query.metric);
      if (metric === undefined || !METRICS.has(metric)) {
        res.status(400).json({
          error:
            'metric is required and must be one of: ctr, cpc, roas, clicks, revenue',
        });
        return;
      }

      const orderRaw = singleQuery(req.query.order);
      let order: 'asc' | 'desc' = 'desc';
      if (orderRaw !== undefined) {
        if (orderRaw !== 'asc' && orderRaw !== 'desc') {
          res.status(400).json({ error: 'order must be asc or desc' });
          return;
        }
        order = orderRaw;
      }

      const limitRaw = singleQuery(req.query.limit);
      let limit = 10;
      if (limitRaw !== undefined) {
        const n = Number(limitRaw);
        if (!Number.isInteger(n) || n < 1) {
          res.status(400).json({
            error: 'limit must be an integer between 1 and 100',
          });
          return;
        }
        if (n > 100) {
          res.status(400).json({ error: 'limit cannot be greater than 100' });
          return;
        }
        limit = n;
      }

      const parsed = parsePerformanceFilters(req);
      if (!parsed.ok) {
        res.status(parsed.status).json({ error: parsed.message });
        return;
      }

      const topQuery: TopPerformingQuery = {
        ...parsed.query,
        metric: metric as TopPerformingQuery['metric'],
        order,
        limit,
      };

      res.status(200).json(getTopPerforming(store, topQuery));
    } catch {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void err;
    res.status(500).json({ error: 'Internal Server Error' });
  });
}
