import express from 'express';
import type { Database } from '../../db.ts';
export function catalogRouter(db: Database) {
  const router = express.Router();
  router.get('/products/current', async (_req, res) => {
    const { rows } = await db.query(
      'SELECT id,name,unit_price_vnd,template_version,is_demo FROM products WHERE is_active=true'
    );
    const p = rows[0];
    if (!p) {
      res
        .status(404)
        .json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Sản phẩm đang được cập nhật.' } });
      return;
    }
    res.json({
      id: p.id,
      name: 'Harméa NFC Music Card',
      unitPriceVnd: p.unit_price_vnd,
      currency: 'VND',
      templateVersion: p.template_version,
      isDemoPrice: p.is_demo,
      image: '/images/card-sample.png',
      cardSizeMm: { width: 54, height: 86 }
    });
  });
  return router;
}
