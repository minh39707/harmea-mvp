import express from 'express';
import type { Database } from '../db.ts';
import { catalogRouter } from './catalog/router.ts';
import { ordersRouter } from './orders/router.ts';
import { orderTrackingRouter } from './orders/tracking.ts';
import { TrackingLookupLimiter } from './orders/lookup.ts';
import { adminProductsRouter } from './admin/products.ts';
import { adminStatsRouter } from './admin/stats.ts';
import { adminOrdersCsvRouter } from './admin/export.ts';
import type { FileStorage } from '../lib/storage/types.ts';
export function apiRouter(
  db: Database,
  trackingLimiter: TrackingLookupLimiter | undefined,
  storage: FileStorage
) {
  const router = express.Router();
  router.use(
    ordersRouter(db, storage),
    adminOrdersCsvRouter(db),
    adminProductsRouter(db),
    adminStatsRouter(db),
    orderTrackingRouter(db, trackingLimiter)
  );
  router.use(catalogRouter(db));
  return router;
}
