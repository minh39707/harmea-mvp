import express from 'express';
import { posix, resolve } from 'node:path';
import type { Request, Response } from 'express';
import { apiRouter } from './modules/index.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { apiGuard } from './middleware/api-guard.ts';
import type { Database } from './db.ts';
import { InputError } from './lib/errors.ts';
import {
  adminApiGate,
  adminPageGate,
  isAdminEnabled,
  warnIfAdminEnabledInProduction
} from './middleware/admin-gate.ts';
import { TrackingLookupLimiter } from './modules/orders/lookup.ts';
import { configuredAppUrl } from './config/app-url.ts';
import { requestLogger } from './middleware/request-logger.ts';
import { trustSingleReverseProxy } from './middleware/trust-proxy.ts';
import { createFileStorage, checkFileStorage } from './lib/storage/index.ts';
import { StorageUnavailable } from './lib/storage/types.ts';
import type { FileStorage } from './lib/storage/types.ts';

const publicSitemapPaths = [
  '/',
  '/design',
  '/about',
  '/how-nfc-works',
  '/faq',
  '/policies/shipping',
  '/policies/returns',
  '/policies/privacy',
  '/contact'
];

function publicOrigin(request: Request) {
  const configured = configuredAppUrl();
  if (!configured && process.env.NODE_ENV === 'production') return null;
  try {
    const value = configured || `${request.protocol}://${request.get('host') ?? ''}`;
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (configured && url.pathname !== '/')
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

function databaseUnavailable(error: unknown) {
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  return /^(ECONN|EHOST|ENET|EAI_|ETIMEDOUT|PROTOCOL_CONNECTION_LOST|PROTOCOL_SEQUENCE_TIMEOUT|POOL_CLOSED|ER_CON_COUNT_ERROR|ER_TOO_MANY_USER_CONNECTIONS|ER_ACCESS_DENIED_ERROR|ER_BAD_DB_ERROR|ER_SERVER_SHUTDOWN)/.test(
    code
  );
}

function sendAppShell(response: Response) {
  response.setHeader('Cache-Control', 'no-cache');
  response.sendFile(resolve('apps/web/dist/index.html'));
}

export function createApp(
  db?: Database,
  options: { trackingLimiter?: TrackingLookupLimiter; storage?: FileStorage } = {}
) {
  const app = express();
  const storage = options.storage ?? createFileStorage();
  trustSingleReverseProxy(app);
  const adminEnabled = isAdminEnabled();
  warnIfAdminEnabledInProduction(adminEnabled);
  app.disable('x-powered-by');
  app.use(requestLogger);
  app.use(securityHeaders);
  app.use('/api', apiGuard());
  app.use(express.json({ limit: '4mb' }));
  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' });
  });
  app.get('/ready', async (_request, response) => {
    if (!db) {
      response.status(503).json({ status: 'not_ready' });
      return;
    }
    try {
      await db.query('SELECT 1');
      await checkFileStorage(storage);
      response.json({ status: 'ok' });
    } catch {
      response.status(503).json({ status: 'not_ready' });
    }
  });
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'harmea-api' });
  });
  app.get('/robots.txt', (request, response) => {
    const origin = publicOrigin(request);
    if (!origin) return response.status(500).type('text/plain').send('APP_URL is invalid.');
    response.setHeader('Cache-Control', 'no-cache');
    response
      .type('text/plain')
      .send(
        [
          'User-agent: *',
          'Disallow: /admin',
          'Disallow: /track',
          'Disallow: /checkout',
          'Disallow: /cart',
          `Sitemap: ${origin}/sitemap.xml`,
          ''
        ].join('\n')
      );
  });
  app.get('/sitemap.xml', (request, response) => {
    const origin = publicOrigin(request);
    if (!origin) return response.status(500).type('text/plain').send('APP_URL is invalid.');
    response.setHeader('Cache-Control', 'no-cache');
    const urls = publicSitemapPaths.map(path => `<url><loc>${origin}${path}</loc></url>`).join('');
    response
      .type('application/xml')
      .send(
        `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
      );
  });
  app.use('/api/admin', adminApiGate(adminEnabled));
  app.use('/admin', adminPageGate(adminEnabled));
  if (db) app.use('/api', apiRouter(db, options.trackingLimiter, storage));
  const webDist = resolve('apps/web/dist');
  app.use(
    express.static(webDist, {
      setHeaders: (response, filePath) => {
        const normalized = filePath.replace(/\\/g, '/');
        const fileName = normalized.slice(normalized.lastIndexOf('/') + 1);
        if (normalized.includes('/assets/') && /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(fileName))
          response.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (fileName === 'index.html') response.setHeader('Cache-Control', 'no-cache');
      }
    })
  );
  app.get(
    ['/admin', '/admin/orders', '/admin/orders/:id', '/admin/products', '/admin/stats'],
    (_req, res) => sendAppShell(res)
  );
  app.use((request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    let pathname: string;
    try {
      pathname = decodeURIComponent(request.path).replace(/\/+$/, '') || '/';
    } catch {
      return next();
    }
    if (
      posix.extname(pathname) ||
      posix.basename(pathname).startsWith('.') ||
      ['/assets/', '/images/', '/fonts/'].some(prefix => pathname.startsWith(prefix))
    )
      return next();
    if (
      pathname === '/health' ||
      pathname === '/ready' ||
      pathname === '/robots.txt' ||
      pathname === '/sitemap.xml' ||
      pathname === '/storage' ||
      pathname.startsWith('/storage/') ||
      pathname === '/api' ||
      pathname.startsWith('/api/') ||
      pathname === '/admin' ||
      pathname.startsWith('/admin/')
    )
      return next();
    sendAppShell(response);
  });
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Endpoint chưa được triển khai trong starter.' }
    });
  });
  const errorHandler: express.ErrorRequestHandler = (error, _request, response, _next) => {
    if (response.headersSent) return _next(error);
    if (error instanceof InputError) {
      if (error.code === 'REQUEST_TOO_LARGE') {
        response.setHeader('Connection', 'close');
        _request.resume();
      }
      response.status(error.status).json({ error: { code: error.code, message: error.message } });
      return;
    }
    const storageUnavailable = error instanceof StorageUnavailable;
    const unavailable = databaseUnavailable(error) || storageUnavailable;
    const status =
      error.type === 'entity.too.large'
        ? 413
        : error instanceof SyntaxError
          ? 400
          : unavailable
            ? 503
            : 500;
    if (status >= 500)
      process.stderr.write(
        `${JSON.stringify({
          level: 'error',
          method: _request.method,
          path: _request.path,
          status,
          code: storageUnavailable
            ? 'STORAGE_UNAVAILABLE'
            : unavailable
              ? 'DATABASE_UNAVAILABLE'
              : 'REQUEST_FAILED'
        })}\n`
      );
    response.status(status).json({
      error: {
        code:
          status === 413 ? 'TOO_LARGE' : status === 503 ? 'SERVICE_UNAVAILABLE' : 'REQUEST_FAILED',
        message:
          status === 413
            ? 'Giỏ hàng quá lớn. Hãy giảm số ảnh.'
            : status === 503
              ? 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.'
              : 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
      }
    });
  };
  app.use(errorHandler);
  return app;
}
