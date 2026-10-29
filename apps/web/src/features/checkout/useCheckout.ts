import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Item, Recipient, Receipt, View, StateSetter } from '../../shared/types';
import { preparedItem } from '../editor/prepared-item';
import { checkoutAttempt } from './attempt';

type CheckoutState = {
  busy: boolean;
  editorBusy: boolean;
  cart: Item[];
  recipient: Recipient;
  confirmed: boolean;
  setBusy: StateSetter<boolean>;
  setError: StateSetter<string>;
  setReceipt: StateSetter<Receipt | null>;
  setCart: StateSetter<Item[]>;
  setRecipient: StateSetter<Recipient>;
  setConfirmed: StateSetter<boolean>;
  go: (view: View) => void;
};
export function useCheckout({
  busy,
  editorBusy,
  cart,
  recipient,
  confirmed,
  setBusy,
  setError,
  setReceipt,
  setCart,
  setRecipient,
  setConfirmed,
  go
}: CheckoutState) {
  const locked = useRef(false),
    attempt = useRef<ReturnType<typeof checkoutAttempt> | null>(null);
  if (!attempt.current)
    attempt.current = checkoutAttempt({
      getItem: k => sessionStorage.getItem(k),
      setItem: (k, v) => sessionStorage.setItem(k, v),
      removeItem: k => sessionStorage.removeItem(k)
    });
  const [pendingRequestKey, setPendingRequestKey] = useState(() => attempt.current!.pendingKey());
  async function checkout(e: FormEvent) {
    e.preventDefault();
    if (busy || locked.current || !cart.length) return;
    if (editorBusy) {
      setError('Chờ thiết kế và ảnh lưu xong trước khi gửi đơn.');
      return;
    }
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const snapshot = structuredClone(cart),
        customer = { ...recipient };
      const prepared = [];
      for (const item of snapshot) prepared.push(await preparedItem(item));
      const result = await attempt.current!.submit(prepared, customer, confirmed);
      if (!result) return;
      setReceipt(result.receipt);
      setCart(old =>
        old.filter(
          item =>
            !snapshot.some(
              sent =>
                sent.id === item.id &&
                sent.assetKey === item.assetKey &&
                sent.quantity === item.quantity &&
                JSON.stringify(sent.design) === JSON.stringify(item.design)
            )
        )
      );
      setRecipient({ name: '', phone: '', address: '', note: '' });
      setConfirmed(false);
      go('success');
      if (result.storageWarning)
        setError('Đơn đã lưu. Hãy sao chép liên kết; trình duyệt chưa xóa được mã gửi cũ.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Chưa gửi được đơn. Dữ liệu vẫn còn.');
    } finally {
      setPendingRequestKey(attempt.current!.pendingKey());
      locked.current = false;
      setBusy(false);
    }
  }
  return { checkout, pendingRequestKey };
}
