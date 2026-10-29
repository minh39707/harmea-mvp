import type { Receipt, PublicTracking } from '../../shared/types.ts';
import { isOrderStatus } from '../../shared/order-status.ts';

function record(value: unknown, keys: string[]): Record<string, unknown> {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some(k => !keys.includes(k)) ||
    keys.some(k => !Object.hasOwn(value, k))
  )
    throw Error('Phản hồi máy chủ không đúng định dạng.');
  return value as Record<string, unknown>;
}
const stamp = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value));
export function receiptResponse(value: unknown): Receipt {
  const r = record(value, [
    'id',
    'orderNumber',
    'status',
    'quantity',
    'unitPriceVnd',
    'subtotalVnd',
    'shippingFeeVnd',
    'currency',
    'trackingToken',
    'createdAt'
  ]);
  if (
    typeof r.id !== 'string' ||
    !/^[0-9a-f-]{36}$/.test(r.id) ||
    typeof r.orderNumber !== 'string' ||
    !r.orderNumber ||
    r.status !== 'pending' ||
    !stamp(r.createdAt) ||
    r.currency !== 'VND' ||
    r.shippingFeeVnd !== null ||
    typeof r.trackingToken !== 'string' ||
    !/^[A-Za-z0-9_-]{43}$/.test(r.trackingToken)
  )
    throw Error('Chưa xác nhận được kết quả đặt đơn.');
  if (
    !Number.isInteger(r.quantity) ||
    Number(r.quantity) < 1 ||
    Number(r.quantity) > 100 ||
    !Number.isSafeInteger(r.unitPriceVnd) ||
    Number(r.unitPriceVnd) < 0 ||
    !Number.isSafeInteger(r.subtotalVnd) ||
    r.subtotalVnd !== Number(r.quantity) * Number(r.unitPriceVnd)
  )
    throw Error('Chưa xác nhận được số tiền của đơn.');
  return r as Receipt;
}
export function trackingResponse(value: unknown): PublicTracking {
  const r = record(value, [
    'orderNumber',
    'status',
    'createdAt',
    'updatedAt',
    'trackingCode',
    'history'
  ]);
  if (
    typeof r.orderNumber !== 'string' ||
    !isOrderStatus(r.status) ||
    !stamp(r.createdAt) ||
    !stamp(r.updatedAt) ||
    (r.trackingCode !== null && typeof r.trackingCode !== 'string') ||
    !Array.isArray(r.history) ||
    r.history.length > 100
  )
    throw Error('Phản hồi tra cứu không hợp lệ.');
  for (const item of r.history) {
    const e = record(item, ['status', 'occurredAt']);
    if (!isOrderStatus(e.status) || !stamp(e.occurredAt)) throw Error('Lịch sử đơn không hợp lệ.');
  }
  return r as PublicTracking;
}
