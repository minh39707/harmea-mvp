import { isOrderStatus } from '../../shared/order-status.ts';
import type { AdminSession, AdminPage, AdminDetail, AdminSummary } from './types.ts';
export const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function adminId(id: string) {
  if (!uuidPattern.test(id)) throw Error('Mã đơn không hợp lệ.');
  return id;
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw Error('Phản hồi quản trị không hợp lệ.');
  return v as Record<string, unknown>;
};
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
export function sessionResponse(v: unknown): AdminSession {
  const r = object(v);
  if (r.authenticated !== true || !date(r.expiresAt))
    throw Error('Không xác nhận được phiên quản trị.');
  return r as AdminSession;
}
function summaryResponse(v: unknown): AdminSummary {
  const r = object(v);
  if (
    typeof r.id !== 'string' ||
    !uuidPattern.test(r.id) ||
    !isOrderStatus(r.status) ||
    !Number.isInteger(r.version) ||
    Number(r.version) < 1 ||
    typeof r.orderNumber !== 'string' ||
    typeof r.recipientName !== 'string' ||
    !Number.isInteger(r.quantity) ||
    !Number.isInteger(r.subtotalVnd) ||
    r.currency !== 'VND' ||
    r.shippingFeeVnd !== null ||
    !date(r.createdAt) ||
    !date(r.updatedAt)
  )
    throw Error('Thông tin đơn không hợp lệ.');
  return r as AdminSummary;
}
export function pageResponse(v: unknown): AdminPage {
  const r = object(v);
  if (
    !Array.isArray(r.items) ||
    r.items.length > 50 ||
    !Number.isInteger(r.page) ||
    Number(r.page) < 1 ||
    !Number.isInteger(r.pageSize) ||
    Number(r.pageSize) < 1 ||
    Number(r.pageSize) > 50 ||
    !Number.isInteger(r.total) ||
    Number(r.total) < 0
  )
    throw Error('Danh sách đơn không hợp lệ.');
  r.items.forEach(summaryResponse);
  return r as AdminPage;
}
export function assetPath(
  orderId: string,
  itemId: string,
  kind: 'photo' | 'preview',
  path: string
) {
  if (!['photo', 'preview'].includes(kind)) throw Error('Loại ảnh không hợp lệ.');
  const expected = `/api/admin/orders/${adminId(orderId)}/items/${adminId(itemId)}/assets/${kind}`;
  if (path !== expected) throw Error('Đường dẫn ảnh không hợp lệ.');
  return expected;
}
export function detailResponse(v: unknown): AdminDetail {
  summaryResponse(v);
  const r = object(v),
    recipient = object(r.recipient),
    product = object(r.productSnapshot);
  if (
    !['name', 'phone', 'address'].every(k => typeof recipient[k] === 'string') ||
    typeof product.name !== 'string' ||
    typeof r.note !== 'string' ||
    typeof r.templateVersion !== 'string' ||
    !Number.isInteger(r.unitPriceVnd) ||
    !Array.isArray(r.items) ||
    !r.items.length ||
    r.items.length > 10 ||
    !Array.isArray(r.history) ||
    r.history.length > 100
  )
    throw Error('Chi tiết đơn không hợp lệ.');
  for (const raw of r.items) {
    const i = object(raw),
      d = object(i.designSnapshot),
      a = object(i.assets);
    if (
      typeof i.id !== 'string' ||
      !Number.isInteger(i.quantity) ||
      Number(i.quantity) < 1 ||
      Number(i.quantity) > 10 ||
      typeof d.fullName !== 'string' ||
      typeof d.musicUrl !== 'string'
    )
      throw Error('Thiết kế của đơn không hợp lệ.');
    for (const key of ['dateOfBirth', 'commemorativeDate', 'place', 'signatureText', 'color'])
      if (d[key] !== undefined && typeof d[key] !== 'string')
        throw Error('Trường chữ của thiết kế không hợp lệ.');
    for (const kind of ['photo', 'preview'] as const)
      assetPath(String(r.id), i.id, kind, String(a[kind]));
  }
  for (const raw of r.history) {
    const e = object(raw);
    if (
      typeof e.id !== 'string' ||
      !isOrderStatus(e.toStatus) ||
      !date(e.occurredAt) ||
      (e.fromStatus !== null && !isOrderStatus(e.fromStatus)) ||
      !['guest', 'admin', 'system'].includes(String(e.actor)) ||
      (e.internalNote !== null && typeof e.internalNote !== 'string')
    )
      throw Error('Lịch sử đơn không hợp lệ.');
  }
  return r as AdminDetail;
}
