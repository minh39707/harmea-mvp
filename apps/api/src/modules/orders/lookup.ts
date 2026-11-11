import { createHmac } from 'node:crypto';
import { InputError } from '../../lib/errors.ts';

export function normalizePhone(value: unknown) {
  if (typeof value !== 'string' || value.length > 32)
    throw new InputError('Số điện thoại không hợp lệ.');
  let phone = value.replace(/[\s.-]/g, '');
  if (phone.startsWith('+84')) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith('84')) phone = `0${phone.slice(2)}`;
  if (!/^0[0-9]{9,10}$/.test(phone)) throw new InputError('Số điện thoại không hợp lệ.');
  return phone;
}

export function lookupSecret() {
  const secret = process.env.LOOKUP_SECRET;
  if (!secret || Buffer.byteLength(secret, 'utf8') < 32)
    throw new Error('LOOKUP_SECRET is required and must contain at least 32 bytes.');
  return secret;
}

export function lookupPhoneHash(phone: string, secret = lookupSecret()) {
  return createHmac('sha256', secret).update(phone, 'utf8').digest('hex');
}

type Bucket = { count: number; until: number };

export class TrackingLookupLimiter {
  private readonly byOrder = new Map<string, Bucket>();
  private readonly byIp = new Map<string, Bucket>();
  private readonly now: () => number;

  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  checkLocked(orderNumber: string, ip: string) {
    const now = this.now();
    this.prune(now);
    const order = this.byOrder.get(orderNumber);
    const client = this.byIp.get(ip || 'unknown');
    const lockedBuckets = [
      order && order.count >= 5 ? order : undefined,
      client && client.count >= 20 ? client : undefined
    ].filter((bucket): bucket is Bucket => bucket !== undefined);
    return {
      locked: lockedBuckets.length > 0,
      retryAfter: lockedBuckets.length
        ? Math.max(
            1,
            Math.ceil((Math.max(...lockedBuckets.map(bucket => bucket.until)) - now) / 1000)
          )
        : 0
    };
  }

  recordWrong(orderNumber: string, ip: string) {
    const now = this.now();
    this.prune(now);
    const order = this.bump(this.byOrder, orderNumber, now);
    const client = this.bump(this.byIp, ip || 'unknown', now);
    const limited = order.count > 5 || client.count > 20;
    return {
      limited,
      retryAfter: Math.max(1, Math.ceil((Math.max(order.until, client.until) - now) / 1000))
    };
  }

  private bump(map: Map<string, Bucket>, key: string, now: number) {
    const prior = map.get(key);
    const next =
      !prior || prior.until <= now
        ? { count: 1, until: now + 15 * 60_000 }
        : { count: prior.count + 1, until: prior.until };
    map.set(key, next);
    return next;
  }

  private prune(now: number) {
    for (const [key, value] of this.byOrder) if (value.until <= now) this.byOrder.delete(key);
    for (const [key, value] of this.byIp) if (value.until <= now) this.byIp.delete(key);
  }
}
