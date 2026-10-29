import { api, ApiError } from '../../shared/api.ts';
import type { Recipient } from '../../shared/types.ts';
import { orderInput, orderForm, orderFingerprint } from './order-form.ts';
import type { PreparedItem } from './order-form.ts';
import { receiptResponse } from './responses.ts';

export const pendingStorageKey = 'harmea.checkout.pending.v1';
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Pending = { requestKey: string; fingerprint: string };
export class CheckoutProblem extends Error {
  kind: 'uncertain' | 'duplicate' | 'blocked' | 'input';
  constructor(message: string, kind: CheckoutProblem['kind']) {
    super(message);
    this.kind = kind;
  }
}
export function checkoutAttempt(store: Store) {
  let pending: Pending | null = null,
    storageProblem = false,
    active = false;
  try {
    const raw = store.getItem(pendingStorageKey);
    if (raw) {
      const value = JSON.parse(raw);
      if (!/^[0-9a-f-]{36}$/.test(value.requestKey) || !/^[0-9a-f]{64}$/.test(value.fingerprint))
        throw Error();
      pending = value;
    }
  } catch {
    storageProblem = true;
  }
  function clear() {
    pending = null;
    try {
      store.removeItem(pendingStorageKey);
      return false;
    } catch {
      try {
        store.setItem(pendingStorageKey, '');
        return false;
      } catch {
        return true;
      }
    }
  }
  return {
    pendingKey: () => pending?.requestKey ?? '',
    async submit(items: PreparedItem[], recipient: Recipient, confirmed: boolean) {
      if (active) return null;
      active = true;
      try {
        if (storageProblem)
          throw new CheckoutProblem(
            'Không đọc được mã gửi trước trên trình duyệt. Liên hệ cửa hàng trước khi đặt lại.',
            'blocked'
          );
        const payload = orderInput(items, recipient, confirmed),
          fingerprint = await orderFingerprint(payload, items);
        if (pending && pending.fingerprint !== fingerprint)
          throw new CheckoutProblem(
            'Yêu cầu trước chưa rõ kết quả. Giữ nguyên thiết kế và người nhận để thử lại, hoặc liên hệ cửa hàng; chưa thể gửi một yêu cầu khác.',
            'blocked'
          );
        const hadPending = Boolean(pending);
        const next = { requestKey: pending?.requestKey ?? crypto.randomUUID(), fingerprint };
        try {
          store.setItem(pendingStorageKey, JSON.stringify(next));
        } catch {
          throw new CheckoutProblem(
            pending
              ? 'Chưa gửi lại được vì trình duyệt không lưu được mã. Kết quả yêu cầu trước vẫn chưa rõ; liên hệ cửa hàng để kiểm tra.'
              : 'Không lưu được mã gửi trên trình duyệt. Lần gửi này chưa thực hiện. Kiểm tra quyền lưu và thử lại.',
            'input'
          );
        }
        pending = next;
        try {
          const response = await api<unknown>(
            '/orders',
            orderForm(payload, items, next.requestKey),
            { signal: AbortSignal.timeout(45000) }
          );
          const receipt = receiptResponse(response),
            storageWarning = clear();
          return { receipt, storageWarning }; // Do not discard a received token if clearing browser storage fails.
        } catch (error) {
          if (
            error instanceof ApiError &&
            error.status === 409 &&
            error.code === 'DUPLICATE_REQUEST'
          )
            throw new CheckoutProblem(
              'Máy chủ đã nhận yêu cầu này nhưng không trả lại liên kết bí mật. Giữ mã yêu cầu và liên hệ cửa hàng để kiểm tra; không tạo thêm đơn cho cùng lần đặt này.',
              'duplicate'
            );
          if (
            error instanceof ApiError &&
            error.status >= 400 &&
            error.status < 500 &&
            error.code !== 'INVALID_RESPONSE' &&
            (error.status !== 409 || error.code === 'PRODUCT_CHANGED')
          ) {
            if (!hadPending) {
              clear();
              throw error;
            }
            throw new CheckoutProblem(
              'Lần thử lại bị từ chối nhưng kết quả yêu cầu trước vẫn chưa rõ. Giữ mã yêu cầu và liên hệ cửa hàng để kiểm tra.',
              'uncertain'
            );
          }
          throw new CheckoutProblem(
            'Chưa xác định được đơn đã lưu hay chưa. Dữ liệu vẫn còn; thử gửi lại cùng nội dung hoặc liên hệ cửa hàng. Không tự tạo một yêu cầu mới.',
            'uncertain'
          );
        }
      } finally {
        active = false;
      }
    }
  };
}
