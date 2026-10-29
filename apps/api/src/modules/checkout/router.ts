import express from 'express';
import type { Database } from '../../db.ts';
import { InputError, sendInputError } from '../../lib/errors.ts';
import { createCheckout } from './service.ts';
export function checkoutRouter(db: Database, secret: string) {
  const router = express.Router();
  router.post('/demo-checkouts', async (req, res) => {
    try {
      const result = await createCheckout(db, secret, req.body);
      res.status(result.status).json(result.body);
    } catch (error) {
      if (error instanceof InputError) {
        sendInputError(res, error);
        return;
      }
      throw error;
    }
  });
  return router;
}
