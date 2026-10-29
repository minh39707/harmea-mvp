import express from 'express';
import { resolve } from 'node:path';
import { commerceRouter } from './commerce.ts';
import type { Database } from './db.ts';

export function createApp(db?: Database, secret = '') {
  const app = express();
  app.disable('x-powered-by');
  app.use((_request, response, next) => {
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(express.json({ limit: '4mb' }));
  const rates = new Map<string, { count: number; until: number }>();
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (
        origin &&
        ![
          process.env.APP_ORIGIN ?? 'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:4000',
          'http://127.0.0.1:4000'
        ].includes(origin)
      ) {
        res
          .status(403)
          .json({ error: { code: 'ORIGIN_DENIED', message: 'Nguồn yêu cầu không hợp lệ.' } });
        return;
      }
      const now = Date.now();
      for (const [key, value] of rates) if (value.until < now) rates.delete(key);
      const key = req.ip ?? 'local',
        entry = rates.get(key) ?? { count: 0, until: now + 60000 };
      entry.count++;
      rates.set(key, entry);
      if (entry.count > 40) {
        res
          .status(429)
          .json({
            error: { code: 'RATE_LIMIT', message: 'Bạn thao tác quá nhanh. Thử lại sau một phút.' }
          });
        return;
      }
    }
    next();
  });
  // Only liveness is implemented. See contracts/openapi.json for planned APIs.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'harmea-api' });
  });
  if (db && secret) app.use('/api', commerceRouter(db, secret));
  app.use(express.static(resolve('apps/web/dist')));
  app.get('/track', (_req, res) => res.sendFile(resolve('apps/web/dist/index.html')));
  app.use((_request, response) => {
    response
      .status(404)
      .json({
        error: { code: 'NOT_FOUND', message: 'Endpoint chưa được triển khai trong starter.' }
      });
  });
  const errorHandler: express.ErrorRequestHandler = (error, _request, response, _next) => {
    const status =
      error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    response
      .status(status)
      .json({
        error: {
          code: status === 413 ? 'TOO_LARGE' : 'REQUEST_FAILED',
          message:
            status === 413
              ? 'Giỏ hàng quá lớn. Hãy giảm số ảnh.'
              : 'Không thể xử lý yêu cầu. Vui lòng thử lại.'
        }
      });
  };
  app.use(errorHandler);
  return app;
}
