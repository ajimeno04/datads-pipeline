const timestamp = () => new Date().toISOString();

export const logger = {
  info:  (msg: string, meta?: object) =>
    console.log(`[${timestamp()}] INFO  ${msg}`, meta ?? ''),
  warn:  (msg: string, meta?: object) =>
    console.warn(`[${timestamp()}] WARN  ${msg}`, meta ?? ''),
  error: (msg: string, meta?: object) =>
    console.error(`[${timestamp()}] ERROR ${msg}`, meta ?? ''),
};

export type Logger = typeof logger;
