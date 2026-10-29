import express from 'express';
import type { Database } from '../db.ts';
import { catalogRouter } from './catalog/router.ts';
import { checkoutRouter } from './checkout/router.ts';
import { trackingRouter } from './tracking/router.ts';
export function apiRouter(db: Database, secret: string) {
  const router = express.Router();
  router.use(catalogRouter(db), checkoutRouter(db, secret), trackingRouter(db, secret));
  return router;
}
