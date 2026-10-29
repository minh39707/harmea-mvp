import express from 'express';
import type { Database } from '../../db.ts';
import { hash } from '../../lib/crypto.ts';
import { checkoutReceipt } from '../checkout/receipt.ts';
export function trackingRouter(db: Database, secret: string) {
  const router = express.Router();
  const { receipt } = checkoutReceipt(secret);
  router.post('/demo-tracking', async (req, res) => {
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy đơn thử. Kiểm tra liên kết theo dõi.'
        }
      });
      return;
    }
    const { rows } = await db.query(
      'SELECT order_number,status,subtotal_vnd,created_at FROM demo_checkouts WHERE tracking_hash=$1',
      [hash(token)]
    );
    if (!rows[0]) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Không tìm thấy đơn thử. Kiểm tra liên kết theo dõi.'
        }
      });
      return;
    }
    res.json(receipt(rows[0]));
  });
  return router;
}
