import 'dotenv/config';
import express from 'express';
import cron from 'node-cron';
import { config } from './shared/config.js';
import { logger } from './shared/logger.js';
import { ResilienceHttpClient } from './shared/http-client.js';
import { SqliteMetricStore } from './storage/sqlite.js';
import { FacebookProvider } from './providers/facebook.js';
import { GoogleProvider } from './providers/google.js';
import { TikTokProvider } from './providers/tiktok.js';
import { ingestAll } from './services/ingestion.js';
import { registerRoutes } from './api/routes.js';
import { lastNDays } from './shared/types.js';

const http      = new ResilienceHttpClient();
const store     = SqliteMetricStore.create(config.db.path);
const providers = [
  new FacebookProvider(http),
  new GoogleProvider(http),
  new TikTokProvider(http),
];

// CLI mode: npm run fetch
if (process.argv[2] === 'fetch') {
  const range = lastNDays(30);
  logger.info('Starting ingestion', { range });
  await ingestAll(providers, store, range, logger);
  logger.info('Ingestion completed', { totalRecords: store.count() });
  process.exit(0);
}

// Server mode
const app = express();
app.use(express.json());
registerRoutes(app, store);

app.listen(config.server.port, () => {
  logger.info(`API ready at http://localhost:${config.server.port}`);
});

// Scheduler: refresh data every hour
cron.schedule('0 * * * *', async () => {
  logger.info('Scheduler: starting data refresh');
  await ingestAll(providers, store, lastNDays(1), logger);
});
