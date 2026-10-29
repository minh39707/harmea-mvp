import { useEffect } from 'react';
import type { Receipt, StateSetter } from '../../shared/types';
import { api } from '../../shared/api';
type TrackingState = {
  setBusy: StateSetter<boolean>;
  setError: StateSetter<string>;
  setReceipt: StateSetter<Receipt | null>;
  setTrackInput: StateSetter<string>;
};
export function useTracking({ setBusy, setError, setReceipt, setTrackInput }: TrackingState) {
  async function lookup(value: string) {
    setBusy(true);
    setError('');
    setReceipt(null);
    let token = value.trim();
    try {
      if (token.includes('#')) token = new URL(token).hash.slice(1);
      const result = await api<Receipt>('/demo-tracking', { token });
      setReceipt(result);
      setTrackInput(token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kiểm tra lại liên kết.');
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (location.pathname === '/track' && location.hash.length > 1)
      void lookup(location.hash.slice(1));
  }, []);
  return lookup;
}
