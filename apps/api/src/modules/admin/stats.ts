import express from 'express';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { parseDateRange } from './date-range.ts';
import { statuses } from '../orders/repository.ts';

export function adminStatsRouter(db: Database) {
  const router = express.Router();
  router.get('/admin/stats', async (req, res) => {
    if (Object.keys(req.query).some(key => !['from', 'to'].includes(key)))
      throw new InputError('Query không hợp lệ.', 'INVALID_QUERY', 400);
    const range = parseDateRange(req.query.from, req.query.to);
    const [statusResult, dailyResult] = await Promise.all([
      db.query(
        `SELECT status,
          CAST(COUNT(*) AS UNSIGNED) AS order_count,
          CAST(SUM(CASE WHEN status <> 'cancelled' THEN subtotal_vnd ELSE 0 END) AS UNSIGNED) AS subtotal_vnd,
          CAST(SUM(CASE WHEN status <> 'cancelled' THEN quantity ELSE 0 END) AS UNSIGNED) AS card_count
         FROM orders WHERE created_at >= ? AND created_at < ? GROUP BY status`,
        [range.startUtc, range.endUtc]
      ),
      db.query(
        `SELECT DATE_FORMAT(DATE_ADD(created_at, INTERVAL 7 HOUR), '%Y-%m-%d') AS local_date,
          CAST(COUNT(*) AS UNSIGNED) AS order_count
         FROM orders WHERE created_at >= ? AND created_at < ?
         GROUP BY local_date ORDER BY local_date`,
        [range.startUtc, range.endUtc]
      )
    ]);
    const ordersByStatus = Object.fromEntries(statuses.map(status => [status, 0])) as Record<
      string,
      number
    >;
    let subtotalVnd = 0;
    let cardCount = 0;
    for (const row of statusResult.rows) {
      if (!statuses.includes(String(row.status))) continue;
      ordersByStatus[String(row.status)] = Number(row.order_count);
      subtotalVnd += Number(row.subtotal_vnd);
      cardCount += Number(row.card_count);
    }
    const byDate = new Map(
      dailyResult.rows.map(row => [String(row.local_date), Number(row.order_count)])
    );
    const ordersByDay = Array.from({ length: range.days }, (_, index) => {
      const date = new Date(Date.parse(`${range.from}T00:00:00.000Z`) + index * 86400000)
        .toISOString()
        .slice(0, 10);
      return { date, orderCount: byDate.get(date) ?? 0 };
    });
    res.json({ ordersByStatus, subtotalVnd, cardCount, ordersByDay });
  });
  return router;
}
