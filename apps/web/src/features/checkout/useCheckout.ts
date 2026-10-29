import { useRef } from 'react';
import type { FormEvent } from 'react';
import type { Item, Recipient, Receipt, View, StateSetter } from '../../shared/types';
import { api } from '../../shared/api';
type CheckoutState = {
  busy: boolean;
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
  const requestKey = useRef(crypto.randomUUID()),
    signature = useRef('');
  async function checkout(e: FormEvent) {
    e.preventDefault();
    if (busy || !cart.length) return;
    setBusy(true);
    setError('');
    const data = {
      items: cart.map(({ productId, quantity, design }) => ({ productId, quantity, design })),
      recipient,
      confirmed
    };
    const stamp = JSON.stringify(data);
    if (signature.current !== stamp) {
      requestKey.current = crypto.randomUUID();
      signature.current = stamp;
    }
    try {
      const result = await api<Receipt>('/demo-checkouts', {
        ...data,
        requestKey: requestKey.current
      });
      setReceipt(result);
      setCart([]);
      setRecipient({ name: '', phone: '', address: '', note: '' });
      setConfirmed(false);
      go('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa gửi được đơn.');
    } finally {
      setBusy(false);
    }
  }
  return checkout;
}
