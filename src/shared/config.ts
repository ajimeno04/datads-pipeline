import 'dotenv/config';

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Required environment variable not found: ${key}\n` +
      `Copy .env.example to .env and fill in the values.`
    );
  }
  return value;
}

export const config = {
  facebook: {
    apiKey: requireEnv('FACEBOOK_API_KEY'),
  },
  google: {
    apiToken: requireEnv('GOOGLE_API_TOKEN'),
  },
  tiktok: {
    apiToken: requireEnv('TIKTOK_API_TOKEN'),
  },
  server: {
    port: Number(process.env['PORT'] ?? 3000),
  },
  db: {
    path: process.env['DB_PATH'] ?? './data.db',
  },
} as const;
