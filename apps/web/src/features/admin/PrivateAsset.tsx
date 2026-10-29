import { useEffect, useState } from 'react';
import { ApiError } from '../../shared/api';
import { privateAsset } from './client';
export default function PrivateAsset({
  orderId,
  itemId,
  kind,
  path,
  onUnauthorized
}: {
  orderId: string;
  itemId: string;
  kind: 'photo' | 'preview';
  path: string;
  onUnauthorized: () => void;
}) {
  const [url, setUrl] = useState(''),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = '';
    setUrl('');
    setError('');
    privateAsset(orderId, itemId, kind, path, controller.signal)
      .then(blob => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          if (error instanceof ApiError && error.status === 401) onUnauthorized();
          else setError(error instanceof Error ? error.message : 'Không tải được ảnh.');
        }
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [orderId, itemId, kind, path, retry]);
  return (
    <div className="admin-asset">
      {url ? (
        <img
          src={url}
          alt={kind === 'preview' ? 'Preview đã xác nhận của đơn' : 'Ảnh gốc riêng tư của thiết kế'}
        />
      ) : error ? (
        <>
          <p className="error" role="alert">
            {error}
          </p>
          <button className="button secondary" onClick={() => setRetry(n => n + 1)}>
            Thử tải lại ảnh
          </button>
        </>
      ) : (
        <p role="status">Đang tải ảnh riêng tư…</p>
      )}
    </div>
  );
}
