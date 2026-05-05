import { logger } from './logger.js';

// Two clearly distinct error types:
// TransientError: the API had a temporary issue (500, network down). Retrying is worth it.
// PermanentError: the request is malformed (400, 401, 404). Retrying does not help.
export class TransientError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'TransientError';
  }
}

export class PermanentError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'PermanentError';
  }
}

const RETRY_CONFIG = {
  maxRetries:  4,
  baseDelayMs: 500,
  maxDelayMs:  30_000,
} as const;

// Implements backoff: base * 2^attempt + jitter
function calculateDelay(attempt: number): number {
  const exponential = RETRY_CONFIG.baseDelayMs * Math.pow(2, attempt);
  const jitter      = Math.random() * 200;
  return Math.min(exponential + jitter, RETRY_CONFIG.maxDelayMs);
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export class ResilienceHttpClient {
  async get<T>(url: string, headers: Record<string, string>): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
      try {
        const response = await fetch(url, { headers });

        // Rate limit: wait what the server indicates
        if (response.status === 429) {
          const retryAfter = Number(response.headers.get('Retry-After') ?? '60');
          logger.warn(`Rate limit reached. Waiting ${retryAfter}s`, { url });
          await sleep(retryAfter * 1000);
          continue; // does not count as a failed attempt
        }

        // Permanent error: do not retry
        if (response.status >= 400 && response.status < 500) {
          throw new PermanentError(
            `HTTP ${response.status} en ${url}`,
            response.status
          );
        }

        // Transient error: retry with backoff
        if (response.status >= 500) {
          throw new TransientError(
            `HTTP ${response.status} en ${url}`,
            response.status
          );
        }

        return response.json() as Promise<T>;

      } catch (err) {
        // Permanent errors: propagate immediately
        if (err instanceof PermanentError) throw err;

        lastError = err as Error;

        if (attempt < RETRY_CONFIG.maxRetries) {
          const delay = calculateDelay(attempt);
          logger.warn(
            `Attempt ${attempt + 1} failed. Retrying in ${Math.round(delay)}ms`,
            {
            url,
            error: lastError.message,
            }
          );
          await sleep(delay);
        }
      }
    }

    throw new Error(
      `Max retries reached for ${url}: ${lastError.message}`
    );
  }
}
