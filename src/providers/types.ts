import type { AdMetric, DateRange, Platform } from '../shared/types.js';

// Each provider implements this interface.
// The consumer (ingestion.ts) only knows this interface — never the concrete providers.
// To add a new platform: create a new file in providers/ and implement this.
export interface PlatformProvider {
  // Identifies the platform handled by this provider
  readonly platform: Platform;

  // AsyncGenerator: each yield delivers a page of metrics already normalized to the canonical model.
  // The consumer processes page by page without waiting for pagination to finish.
  // Each provider encapsulates its own pagination logic (cursor, token, or offset).
  fetchMetrics(range: DateRange): AsyncGenerator<AdMetric[]>;
}
