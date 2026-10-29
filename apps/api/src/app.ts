import express from 'express';
import { resolve } from 'node:path';
import { apiRouter } from './modules/index.ts';
import { securityHeaders } from './middleware/security-headers.ts';
import { apiGuard } from './middleware/api-guard.ts';
import type { Database } from './db.ts';

export function createApp(db?: Database, secret = '') {
  const app = express();
  app.disable('x-powered-by');
  app.use(securityHeaders);
  app.use(express.json({ limit: '4mb' }));
  app.use('/api', apiGuard());
  // Demo commerce routes are mounted below; admin/order contract routes remain planned.
  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok', service: 'harmea-api' });
  });
  if (db && secret) app.use('/api', apiRouter(db, secret));
  app.use(express.static(resolve('apps/web/dist')));
  app.get('/track', (_req, res) => res.sendFile(resolve('apps/web/dist/index.html')));
  app.use((_request, response) => {
    response.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Endpoint chưa được triển khai trong starter.' }
    });
  });
  const errorHandler: express.ErrorRequestHandler = (error, _request, response, _next) => {
    const status =
      error.type === 'entity.too.large' ? 413 : error instanceof SyntaxError ? 400 : 500;
    response.status(status).json({
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
