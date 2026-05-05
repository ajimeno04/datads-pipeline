import type { PlatformProvider } from '../providers/types.js';
import type { Logger } from '../shared/logger.js';
import type { DateRange, Platform } from '../shared/types.js';
import type { MetricStore } from '../storage/types.js';

// This function receives providers as an array (it does not know which ones)
// and a store to persist into. It does not import anything from facebook/google/tiktok directly.
export async function ingestPlatform(
  provider: PlatformProvider,
  store: MetricStore,
  range: DateRange,
  log: Logger
): Promise<{ platform: Platform; saved: number; pages: number }> {
  let pages = 0;
  let saved = 0;

  for await (const page of provider.fetchMetrics(range)) {
    pages += 1;
    store.save(page);
    saved += page.length;
    log.info('Ingestion progress', {
      platform: provider.platform,
      page: pages,
      recordsInPage: page.length,
    });
  }

  return { platform: provider.platform, saved, pages };
}

// Convenience function to ingest all platforms sequentially
export async function ingestAll(
  providers: PlatformProvider[],
  store: MetricStore,
  range: DateRange,
  log: Logger
): Promise<void> {
  for (const provider of providers) {
    try {
      const result = await ingestPlatform(provider, store, range, log);
      log.info(`Ingestion completed`, result);
    } catch (err) {
      // One failing provider should not stop the others
      log.error(`Provider failed: ${provider.platform}`, { error: String(err) });
    }
  }
}
