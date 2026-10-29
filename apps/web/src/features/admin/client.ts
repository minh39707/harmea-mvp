import { api, ApiError } from '../../shared/api.ts';
import type { OrderStatus } from '../../shared/types.ts';
import type { AdminDetail, StatusDraft } from './types.ts';
import { adminId, assetPath, sessionResponse, pageResponse, detailResponse } from './validation.ts';
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['producing', 'cancelled'],
  producing: ['shipping'],
  shipping: ['completed'],
  completed: [],
  cancelled: []
};
const readOptions = (signal?: AbortSignal) => ({
  signal: signal
    ? AbortSignal.any([signal, AbortSignal.timeout(15000)])
    : AbortSignal.timeout(15000)
});
export async function adminSession(signal?: AbortSignal) {
  return sessionResponse(await api('/admin/session', undefined, readOptions(signal)));
}
export async function loginAdmin(username: string, password: string) {
  return sessionResponse(
    await api(
      '/admin/session',
      { username: username.trim(), password },
      { signal: AbortSignal.timeout(15000) }
    )
  );
}
export async function logoutAdmin() {
  await api('/admin/session', undefined, { method: 'DELETE', signal: AbortSignal.timeout(15000) });
}
export async function adminOrders(page: number, status: OrderStatus | '', signal?: AbortSignal) {
  if (!Number.isInteger(page) || page < 1) throw Error('Trang không hợp lệ.');
  const query = new URLSearchParams({ page: String(page), pageSize: '20' });
  if (status) query.set('status', status);
  return pageResponse(await api(`/admin/orders?${query}`, undefined, readOptions(signal)));
}
export async function adminOrder(id: string, signal?: AbortSignal) {
  return detailResponse(await api(`/admin/orders/${adminId(id)}`, undefined, readOptions(signal)));
}
export class AdminInputError extends Error {}
export function statusPayload(order: AdminDetail, draft: StatusDraft) {
  if (!draft.confirmed)
    throw new AdminInputError('Kiểm tra đơn và xác nhận thao tác trước khi cập nhật.');
  if (!nextStatuses[order.status].includes(draft.status))
    throw new AdminInputError('Chuyển trạng thái không hợp lệ.');
  if (draft.status === 'cancelled' && (!draft.reason.trim() || draft.reason.trim().length > 500))
    throw new AdminInputError('Lý do hủy cần từ 1 đến 500 ký tự.');
  if (draft.trackingCode.trim().length > 80)
    throw new AdminInputError('Mã vận đơn tối đa 80 ký tự.');
  return {
    expectedVersion: order.version,
    status: draft.status,
    ...(draft.status === 'cancelled' ? { cancellationReason: draft.reason.trim() } : {}),
    ...(draft.status === 'shipping' && draft.trackingCode.trim()
      ? { trackingCode: draft.trackingCode.trim() }
      : {})
  };
}
export async function changeStatus(order: AdminDetail, draft: StatusDraft) {
  const body = statusPayload(order, draft);
  try {
    return {
      kind: 'updated' as const,
      order: detailResponse(
        await api(`/admin/orders/${adminId(order.id)}/status`, body, {
          method: 'PATCH',
          signal: AbortSignal.timeout(30000)
        })
      )
    };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409)
      return { kind: 'conflict' as const, order: await adminOrder(order.id) };
    throw error;
  }
}
export async function privateAsset(
  orderId: string,
  itemId: string,
  kind: 'photo' | 'preview',
  path: string,
  signal?: AbortSignal
) {
  const url = assetPath(orderId, itemId, kind, path);
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: readOptions(signal).signal
  }).catch(() => {
    throw new ApiError('Không tải được ảnh. Thử lại sau.', 0, 'NETWORK_ERROR');
  });
  if (!response.ok)
    throw new ApiError(
      response.status === 401
        ? 'Phiên đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Không tải được tệp của đơn.',
      response.status,
      'ASSET_FAILED'
    );
  const type = response.headers.get('Content-Type')?.split(';')[0];
  if (!type || !(kind === 'preview' ? ['image/png'] : ['image/jpeg', 'image/png']).includes(type))
    throw Error('Định dạng ảnh phản hồi không hợp lệ.');
  const blob = await response.blob();
  if (blob.size > (kind === 'photo' ? 5 : 2) * 1024 * 1024)
    throw Error('Ảnh phản hồi vượt giới hạn.');
  return blob;
}
