import express from 'express';
import type { Request, RequestHandler } from 'express';
import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Database } from '../../db.ts';
import { InputError } from '../../lib/errors.ts';
import { hash } from '../../lib/crypto.ts';
import { fields } from '../orders/validation.ts';
import { text } from '../../lib/validate.ts';

export type AdminConfig = { username: string; passwordHash: string; secureCookie: boolean };
const derive = promisify(scrypt);
const cookieName = 'harmea_admin';
export function sessionToken(req: Request) {
  const raw = req.headers.cookie
    ?.split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  return raw && /^[A-Za-z0-9_-]{43}$/.test(raw) ? raw : null;
}
function cookieOptions(secure: boolean) {
  return { httpOnly: true, sameSite: 'lax' as const, path: '/api/admin', secure };
}
export function requireAdmin(db: Database): RequestHandler {
  return async (req, _res, next) => {
    const token = sessionToken(req);
    const session = token
      ? (
          await db.query(
            'SELECT id FROM admin_sessions WHERE token_hash=$1 AND expires_at>CURRENT_TIMESTAMP',
            [hash(token)]
          )
        ).rows[0]
      : null;
    if (!session) throw new InputError('Vui lòng đăng nhập quản trị.', 'UNAUTHENTICATED', 401);
    next();
  };
}
export function sessionRouter(db: Database, config: AdminConfig) {
  const router = express.Router();
  const attempts = new Map<string, { count: number; until: number }>();
  router.post('/session', async (req, res) => {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until < now) attempts.delete(key);
    const key = req.ip ?? 'local',
      entry = attempts.get(key) ?? { count: 0, until: now + 60000 };
    entry.count++;
    attempts.set(key, entry);
    if (entry.count > 5) {
      res.setHeader('Retry-After', '60');
      throw new InputError('Thử đăng nhập lại sau một phút.', 'RATE_LIMIT', 429);
    }
    const b = fields(req.body, ['username', 'password']);
    const username = text(b.username, 'tài khoản', 80);
    if (typeof b.password !== 'string' || b.password.length < 1 || b.password.length > 256)
      throw new InputError('Mật khẩu không hợp lệ.');
    if (!/^[0-9a-f]{32}:[0-9a-f]{128}$/i.test(config.passwordHash))
      throw new InputError('Chưa cấu hình quản trị.', 'ADMIN_NOT_CONFIGURED', 503);
    const [salt, expected] = config.passwordHash.split(':');
    const actual = (await derive(b.password, salt!, 64)) as Buffer;
    const valid = timingSafeEqual(actual, Buffer.from(expected!, 'hex'));
    if (!valid || username !== config.username)
      throw new InputError('Tài khoản hoặc mật khẩu không đúng.', 'INVALID_CREDENTIALS', 401);
    const token = randomBytes(32).toString('base64url'),
      expires = new Date(now + 8 * 60 * 60 * 1000);
    const previous = sessionToken(req);
    await db.transaction(async tx => {
      if (previous)
        await tx.query('DELETE FROM admin_sessions WHERE token_hash=$1', [hash(previous)]);
      await tx.query('DELETE FROM admin_sessions WHERE expires_at<=CURRENT_TIMESTAMP');
      await tx.query('INSERT INTO admin_sessions(id,token_hash,expires_at) VALUES($1,$2,$3)', [
        randomUUID(),
        hash(token),
        expires.toISOString()
      ]);
    });
    res.cookie(cookieName, token, {
      ...cookieOptions(config.secureCookie),
      maxAge: 8 * 60 * 60 * 1000
    });
    res.json({ authenticated: true, expiresAt: expires.toISOString() });
  });
  router.use('/session', requireAdmin(db));
  router.get('/session', async (req, res) => {
    const row = (
      await db.query('SELECT expires_at FROM admin_sessions WHERE token_hash=$1', [
        hash(sessionToken(req)!)
      ])
    ).rows[0]!;
    res.json({ authenticated: true, expiresAt: row.expires_at });
  });
  router.delete('/session', async (req, res) => {
    await db.query('DELETE FROM admin_sessions WHERE token_hash=$1', [hash(sessionToken(req)!)]);
    res.clearCookie(cookieName, cookieOptions(config.secureCookie));
    res.status(204).end();
  });
  return router;
}
