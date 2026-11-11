import type { RequestHandler } from 'express';

export function isAdminEnabled(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.ADMIN_ENABLED;
  return configured === undefined ? env.NODE_ENV !== 'production' : configured === 'true';
}

let productionWarningWritten = false;

export function warnIfAdminEnabledInProduction(enabled: boolean) {
  if (enabled && process.env.NODE_ENV === 'production' && !productionWarningWritten) {
    productionWarningWritten = true;
    console.warn(
      JSON.stringify({
        level: 'warn',
        code: 'ADMIN_PRODUCTION_PROXY_REQUIRED',
        message: 'Admin đang bật; phải được bảo vệ ở reverse proxy.'
      })
    );
  }
}

export const adminApiGate =
  (enabled: boolean): RequestHandler =>
  (_req, res, next) => {
    if (enabled) return next();
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy.' } });
  };

export const adminPageGate =
  (enabled: boolean): RequestHandler =>
  (_req, res, next) => {
    if (enabled) return next();
    res.status(404).type('html').send('<!doctype html><title>404</title><h1>Không tìm thấy.</h1>');
  };
