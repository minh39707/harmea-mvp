import { useEffect, useRef, useState } from 'react';
import type { PublicTracking, StateSetter, View } from '../../shared/types';
import { api } from '../../shared/api';
import { trackingResponse } from '../checkout/responses';
import { trackingToken } from './links';
type TrackingState = {
  view: View;
  setError: StateSetter<string>;
  setTracking: StateSetter<PublicTracking | null>;
  setTrackInput: StateSetter<string>;
};
export function useTracking({ view, setError, setTracking, setTrackInput }: TrackingState) {
  const [trackingBusy, setTrackingBusy] = useState(false);
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null);
  async function lookup(value: string) {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setTrackingBusy(true);
    setError('');
    setTracking(null);
    try {
      const token = trackingToken(value);
      const result = trackingResponse(
        await api<unknown>(
          '/tracking/lookup',
          { token },
          { signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) }
        )
      );
      if (request !== sequence.current || location.pathname !== '/track') return;
      setTracking(result);
      setTrackInput(token);
      history.replaceState(null, '', `/track#${token}`);
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
      const load = () => {
        if (location.pathname === '/track' && location.hash.length > 1)
          void lookup(location.hash.slice(1));
      };
      load();
      window.addEventListener('hashchange', load);
      return () => {
        window.removeEventListener('hashchange', load);
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
