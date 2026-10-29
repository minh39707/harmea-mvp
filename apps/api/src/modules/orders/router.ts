import express from 'express';
import { resolve } from 'node:path';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { requireAdmin } from '../admin/session.ts';
import { multipart } from './uploads.ts';
import { createOrder } from './create.ts';
import { detail, summary } from './presentation.ts';
import { id, integer } from './validation.ts';
import { statuses } from './repository.ts';
import { updateStatus } from './state.ts';

export function ordersRouter(db: Database, uploadDir: string) {
  const router = express.Router();
  const root = resolve(uploadDir);
  let active = 0;
  router.post('/orders', async (req, res) => {
    if (active >= 2) {
      res.setHeader('Retry-After', '5');
      throw new InputError('Hệ thống đang xử lý ảnh. Thử lại sau.', 'UPLOAD_BUSY', 429);
    }
    active++;
    try {
      res.status(201).json(await createOrder(db, root, await multipart(req)));
    } finally {
      active--;
    }
  });
  router.use('/admin', requireAdmin(db));
  router.get('/admin/orders', async (req, res) => {
    if (Object.keys(req.query).some(k => !['page', 'pageSize', 'status'].includes(k)))
      throw new InputError('Query không hợp lệ.', 'INVALID_QUERY', 400);
    const queryNumber = (value: unknown, fallback: number, max: number) => {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || Number(value) > max)
        throw new InputError('Query không hợp lệ.', 'INVALID_QUERY', 400);
      return integer(Number(value), 1, max);
    };
    const page = queryNumber(req.query.page, 1, 1000000),
      pageSize = queryNumber(req.query.pageSize, 20, 50);
    const status = req.query.status;
    if (status !== undefined && (typeof status !== 'string' || !statuses.includes(status)))
      throw new InputError('Trạng thái lọc không hợp lệ.', 'INVALID_QUERY', 400);
    const result = await db.transaction(async tx => {
      const rows = await tx.query(
        'SELECT * FROM orders WHERE ($1::text IS NULL OR status=$1) ORDER BY created_at DESC,id LIMIT $2 OFFSET $3',
        [status ?? null, pageSize, (page - 1) * pageSize]
      );
      const count = await tx.query(
        'SELECT count(*)::int AS total FROM orders WHERE ($1::text IS NULL OR status=$1)',
        [status ?? null]
      );
      return { items: rows.rows.map(summary), page, pageSize, total: count.rows[0]!.total };
    });
    res.json(result);
  });
  router.get('/admin/orders/:id', async (req, res) => {
    const orderId = id(req.params.id);
    res.json(
      await db.transaction(async tx => {
        await tx.query('SELECT id FROM orders WHERE id=$1 FOR SHARE', [orderId]);
        return detail(tx, orderId);
      })
    );
  });
  router.patch('/admin/orders/:id/status', async (req, res) => {
    res.json(await updateStatus(db, id(req.params.id), req.body));
  });
  router.get('/admin/orders/:id/items/:itemId/assets/:kind', async (req, res) => {
    const orderId = id(req.params.id),
      itemId = id(req.params.itemId),
      kind = req.params.kind;
    if (!['photo', 'preview'].includes(kind))
      throw new InputError('Không tìm thấy tệp.', 'ASSET_NOT_FOUND', 404);
    const item = (
      await db.query('SELECT photo_key,preview_key FROM order_items WHERE order_id=$1 AND id=$2', [
        orderId,
        itemId
      ])
    ).rows[0];
    const key = item?.[kind === 'photo' ? 'photo_key' : 'preview_key'];
    if (typeof key !== 'string' || !/^[0-9a-f-]{36}\.(png|jpg)$/.test(key))
      throw new InputError('Không tìm thấy tệp.', 'ASSET_NOT_FOUND', 404);
    res.setHeader('Cache-Control', 'private, no-store');
    res.download(resolve(root, key), `${kind}.${key.endsWith('.jpg') ? 'jpg' : 'png'}`, error => {
      if (error && !res.headersSent)
        res
          .status(404)
          .json({ error: { code: 'ASSET_NOT_FOUND', message: 'Không tìm thấy tệp.' } });
    });
  });
  return router;
}
