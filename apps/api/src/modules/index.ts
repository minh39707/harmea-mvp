import express from 'express';
import type { Database } from '../db.ts';
import { catalogRouter } from './catalog/router.ts';
import { ordersRouter } from './orders/router.ts';
import { orderTrackingRouter } from './orders/tracking.ts';
import { sessionRouter } from './admin/session.ts';
export function apiRouter(db: Database) {
  const router = express.Router();
  router.use(
    '/admin',
    sessionRouter(db, {
      username: process.env.ADMIN_USERNAME ?? 'admin',
      passwordHash: process.env.ADMIN_PASSWORD_HASH ?? '',
      secureCookie: (process.env.APP_ORIGIN ?? '').startsWith('https:')
    })
  );
  router.use(
    ordersRouter(db, process.env.UPLOAD_DIR ?? 'storage/uploads'),
    orderTrackingRouter(db)
  );
  router.use(catalogRouter(db));
  return router;
}
