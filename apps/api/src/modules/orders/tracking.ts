import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { getHistory } from './repository.ts';
import { lookupPhoneHash, normalizePhone, TrackingLookupLimiter } from './lookup.ts';

const orderPattern = /^HM-[0-9A-F]{16}$/;
const notFound = () =>
  new InputError('Không tìm thấy đơn. Kiểm tra mã đơn và số điện thoại.', 'ORDER_NOT_FOUND', 404);

export function orderTrackingRouter(db: Database, limiter = new TrackingLookupLimiter()) {
  const router = express.Router();
  router.post(['/tracking/lookup', '/tracking/payment-confirm'], async (req, res) => {
    const body =
      req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const orderNumber =
      typeof body.orderNumber === 'string' ? body.orderNumber.trim().toUpperCase() : '';
    let phone: string | null = null;
    try {
      phone = normalizePhone(body.phone);
    } catch {
      // Invalid input follows the same public response as an unknown order.
    }

    const validOrderNumber = orderPattern.test(orderNumber);
    const limiterOrderNumber = validOrderNumber ? orderNumber : 'invalid';
    const lock = limiter.checkLocked(limiterOrderNumber, req.ip ?? 'unknown');
    if (lock.locked) {
      res.setHeader('Retry-After', String(lock.retryAfter));
      throw new InputError(
        'Bạn thử tra cứu quá nhiều lần. Vui lòng thử lại sau.',
        'RATE_LIMIT',
        429
      );
    }
    const row =
      validOrderNumber && phone
        ? (
            await db.query(
              'SELECT id,order_number,status,created_at,updated_at,tracking_code,lookup_phone_hash FROM orders WHERE order_number=?',
              [orderNumber]
            )
          ).rows[0]
        : undefined;
    const stored =
      typeof row?.lookup_phone_hash === 'string' && /^[0-9a-f]{64}$/.test(row.lookup_phone_hash)
        ? Buffer.from(row.lookup_phone_hash, 'hex')
        : Buffer.alloc(32);
    const submitted = phone ? Buffer.from(lookupPhoneHash(phone), 'hex') : Buffer.alloc(32);
    const matches = Boolean(row && validOrderNumber && phone && timingSafeEqual(stored, submitted));
    if (!matches) {
      const attempt = limiter.recordWrong(limiterOrderNumber, req.ip ?? 'unknown');
      if (attempt.limited) {
        res.setHeader('Retry-After', String(attempt.retryAfter));
        throw new InputError(
          'Bạn thử tra cứu quá nhiều lần. Vui lòng thử lại sau.',
          'RATE_LIMIT',
          429
        );
      }
      throw notFound();
    }

    if (req.path === '/tracking/payment-confirm') {
      const report = await db.transaction(async tx => {
        const order = (await tx.query('SELECT status FROM orders WHERE id=? FOR UPDATE', [row!.id]))
          .rows[0];
        if (order?.status === 'cancelled')
          throw new InputError(
            'Đơn đã hủy không thể xác nhận chuyển khoản.',
            'ORDER_CANCELLED',
            409
          );
        // The report row is the immutable audit event. Retries keep its original timestamp.
        await tx.query(
          'INSERT INTO order_payment_reports(order_id) VALUES(?) ON DUPLICATE KEY UPDATE order_id=order_id',
          [row!.id]
        );
        return (
          await tx.query('SELECT reported_at FROM order_payment_reports WHERE order_id=?', [
            row!.id
          ])
        ).rows[0]!;
      });
      res.json({ orderNumber: row!.order_number, reportedAt: report.reported_at });
      return;
    }
    const history = (await getHistory(db, String(row!.id))).rows;
    res.json({
      orderNumber: row!.order_number,
      status: row!.status,
      createdAt: row!.created_at,
      updatedAt: row!.updated_at,
      trackingCode: row!.tracking_code,
      history: history.map(event => ({ status: event.to_status, occurredAt: event.occurred_at }))
    });
  });
  return router;
}
