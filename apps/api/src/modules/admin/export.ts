import express from 'express';
import type { Response } from 'express';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { statuses } from '../orders/repository.ts';
import { parseDateRange } from './date-range.ts';

const headers = [
  'Mã đơn',
  'Ngày',
  'Trạng thái',
  'Số thiết kế',
  'Số thẻ',
  'Tổng tiền',
  'Tên người nhận',
  'SĐT',
  'Địa chỉ',
  'Mã vận đơn'
];
const pageSize = 500;

function csvCell(value: unknown) {
  let text = value == null ? '' : String(value);
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function csvRow(values: unknown[]) {
  return values.map(csvCell).join(',') + '\r\n';
}

function recipient(value: unknown) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeChunk(response: Response, chunk: string) {
  if (response.destroyed) return false;
  if (!response.write(chunk))
    await new Promise<void>(resolve => {
      const resume = () => {
        response.off('drain', resume);
        response.off('close', resume);
        response.off('error', resume);
        resolve();
      };
      response.once('drain', resume);
      response.once('close', resume);
      response.once('error', resume);
    });
  return !response.destroyed;
}

export function adminOrdersCsvRouter(db: Database) {
  const router = express.Router();
  router.get('/admin/orders.csv', async (req, res) => {
    if (Object.keys(req.query).some(key => !['status', 'from', 'to'].includes(key)))
      throw new InputError('Query không hợp lệ.', 'INVALID_QUERY', 400);
    const status = req.query.status;
    if (status !== undefined && (typeof status !== 'string' || !statuses.includes(status)))
      throw new InputError('Trạng thái lọc không hợp lệ.', 'INVALID_QUERY', 400);
    const hasRange = req.query.from !== undefined || req.query.to !== undefined;
    const range = hasRange ? parseDateRange(req.query.from, req.query.to) : undefined;
    const predicates: string[] = [];
    const values: unknown[] = [];
    if (status) {
      predicates.push('o.status=?');
      values.push(status);
    }
    if (range) {
      predicates.push('o.created_at >= ?', 'o.created_at < ?');
      values.push(range.startUtc, range.endUtc);
    }
    const where = predicates.length ? `WHERE ${predicates.join(' AND ')}` : '';
    const queryPage = async (cursor?: { createdAt: unknown; id: unknown }) => {
      const cursorClause = cursor
        ? ' AND (o.created_at < ? OR (o.created_at = ? AND o.id < ?))'
        : '';
      const cursorValues = cursor ? [cursor.createdAt, cursor.createdAt, cursor.id] : [];
      return db.query(
        `SELECT o.id,o.order_number,o.created_at,o.status,o.quantity,o.subtotal_vnd,
          o.recipient_snapshot,o.tracking_code,
          (SELECT CAST(COUNT(*) AS UNSIGNED) FROM order_items i WHERE i.order_id=o.id) AS design_count
         FROM orders o ${where}${cursorClause}
         ORDER BY o.created_at DESC,o.id DESC LIMIT ?`,
        [...values, ...cursorValues, pageSize]
      );
    };

    res.status(200);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="harmea-orders.csv"');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (!(await writeChunk(res, '\uFEFF' + csvRow(headers)))) return;

    let cursor: { createdAt: unknown; id: unknown } | undefined;
    for (;;) {
      const page = await queryPage(cursor);
      for (const row of page.rows) {
        const to = recipient(row.recipient_snapshot);
        if (
          !(await writeChunk(
            res,
            csvRow([
              row.order_number,
              row.created_at,
              row.status,
              row.design_count,
              row.quantity,
              row.subtotal_vnd,
              to.name,
              to.phone,
              to.address,
              row.tracking_code
            ])
          ))
        )
          return;
      }
      if (page.rows.length < pageSize) break;
      const last = page.rows.at(-1)!;
      cursor = { createdAt: last.created_at, id: last.id };
    }
    res.end();
  });
  return router;
}
