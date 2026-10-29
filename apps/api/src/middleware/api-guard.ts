import type { RequestHandler } from 'express';
export function apiGuard() {
  const rates = new Map<string, { count: number; until: number }>();
  const guard: RequestHandler = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method === 'POST') {
      const origin = req.headers.origin;
      if (
        origin &&
        ![
          process.env.APP_ORIGIN ?? 'http://localhost:5173',
          'http://127.0.0.1:5173',
          'http://localhost:4000',
          'http://127.0.0.1:4000'
        ].includes(origin)
      ) {
        res
          .status(403)
          .json({ error: { code: 'ORIGIN_DENIED', message: 'Nguồn yêu cầu không hợp lệ.' } });
        return;
      }
      const now = Date.now();
      for (const [key, value] of rates) if (value.until < now) rates.delete(key);
      const key = req.ip ?? 'local',
        entry = rates.get(key) ?? { count: 0, until: now + 60000 };
      entry.count++;
      rates.set(key, entry);
      if (entry.count > 40) {
        res.status(429).json({
          error: { code: 'RATE_LIMIT', message: 'Bạn thao tác quá nhanh. Thử lại sau một phút.' }
        });
        return;
      }
    }
    next();
  };
  return guard;
}
