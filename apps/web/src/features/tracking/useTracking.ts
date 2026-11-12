import { useEffect, useRef, useState } from 'react';
import type { PublicTracking, StateSetter, View } from '../../shared/types';
import { api } from '../../shared/api';
import { trackingResponse } from '../checkout/responses';
type TrackingState = {
  view: View;
  setError: StateSetter<string>;
  setTracking: StateSetter<PublicTracking | null>;
};
export function useTracking({ view, setError, setTracking }: TrackingState) {
  const [trackingBusy, setTrackingBusy] = useState(false);
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null);
  async function lookup(orderNumber: string, phone: string) {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setTrackingBusy(true);
    setError('');
    setTracking(null);
    try {
      const result = trackingResponse(
        await api<unknown>(
          '/tracking/lookup',
          { orderNumber, phone },
          { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) }
        )
      );
      if (request !== sequence.current || location.pathname !== '/track') return;
      setTracking(result);
      if (location.hash) history.replaceState(null, '', '/track');
    } catch (error) {
      if (request === sequence.current && !abort.signal.aborted && location.pathname === '/track')
        setError(error instanceof Error ? error.message : 'Không tra cứu được đơn.');
    } finally {
      if (request === sequence.current) setTrackingBusy(false);
    }
  }
  useEffect(() => {
    setTrackingBusy(false);
    if (view === 'tracking') {
      return () => {
        sequence.current++;
        controller.current?.abort();
      };
    }
    return () => {
      sequence.current++;
      controller.current?.abort();
    };
  }, [view]);
  return { lookup, trackingBusy };
}
