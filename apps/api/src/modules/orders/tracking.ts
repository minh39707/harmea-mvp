import express from 'express';
import type { Database } from '../../db.ts';
import { hash } from '../../lib/crypto.ts';
import { InputError } from '../../lib/errors.ts';
import { getHistory } from './repository.ts';
import { fields } from './validation.ts';

export function orderTrackingRouter(db: Database) {
  const router = express.Router();
  router.post('/tracking/lookup', async (req, res) => {
    const token = fields(req.body, ['token']).token;
    const missing = () =>
      new InputError('Không tìm thấy đơn. Kiểm tra liên kết theo dõi.', 'ORDER_NOT_FOUND', 404);
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw missing();
    const result = await db.transaction(async tx => {
      const r = (
        await tx.query(
          'SELECT id,order_number,status,created_at,updated_at,tracking_code FROM orders WHERE tracking_token_hash=$1 FOR SHARE',
          [hash(token)]
        )
      ).rows[0];
      if (!r) throw missing();
      const history = (await getHistory(tx, String(r.id))).rows;
      return {
        orderNumber: r.order_number,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        trackingCode: r.tracking_code,
        history: history.map(e => ({ status: e.to_status, occurredAt: e.occurred_at }))
      };
    });
    res.json(result);
  });
  return router;
}
