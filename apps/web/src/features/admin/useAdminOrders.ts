import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../../shared/api';
import type { OrderStatus } from '../../shared/types';
import type { AdminPage, AdminDetail, StatusDraft } from './types';
import type { AdminRoute } from './route';
import { adminOrders, adminOrder, changeStatus, AdminInputError } from './client';

export function useAdminOrders(route: AdminRoute, onUnauthorized: () => void) {
  const [page, setPage] = useState(1),
    [filter, setFilter] = useState<OrderStatus | ''>(''),
    [list, setList] = useState<AdminPage | null>(null),
    [detail, setDetail] = useState<AdminDetail | null>(null);
  const [busy, setBusy] = useState(false),
    [saving, setSaving] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [reviewRequired, setReviewRequired] = useState(false),
    [revision, setRevision] = useState(0);
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null),
    locked = useRef(false);
  const id = route.kind === 'detail' ? route.id : null;
  function fail(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      onUnauthorized();
      return;
    }
    setError(error instanceof Error ? error.message : 'Không tải được dữ liệu quản trị.');
  }
  async function refresh() {
    const request = ++sequence.current;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (id) {
        const result = await adminOrder(id, abort.signal);
        if (request === sequence.current) {
          setDetail(result);
          setReviewRequired(false);
          setRevision(n => n + 1);
        }
      } else {
        const result = await adminOrders(page, filter, abort.signal);
        if (request === sequence.current) setList(result);
      }
    } catch (error) {
      if (!abort.signal.aborted && request === sequence.current) {
        if (id) setReviewRequired(true);
        fail(error);
      }
    } finally {
      if (request === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    setList(null);
    setDetail(null);
    setReviewRequired(false);
    void refresh();
    return () => {
      sequence.current++;
      controller.current?.abort();
    };
  }, [id, page, filter]);
  async function update(draft: StatusDraft) {
    if (!detail || busy || saving || locked.current || reviewRequired) return;
    locked.current = true;
    setSaving(true);
    setError('');
    setNotice('');
    const request = sequence.current;
    try {
      const result = await changeStatus(detail, draft);
      if (request !== sequence.current) return;
      setDetail(result.order);
      setRevision(n => n + 1);
      setReviewRequired(false);
      setNotice(
        result.kind === 'conflict'
          ? 'Đơn đã được thay đổi. Đã tải dữ liệu mới; hãy chọn lại và xác nhận thao tác. Không có lần cập nhật tự động nào.'
          : 'Đã cập nhật trạng thái và lịch sử.'
      );
    } catch (error) {
      if (request === sequence.current) {
        if (
          !(error instanceof AdminInputError) &&
          (!(error instanceof ApiError) ||
            error.status === 0 ||
            error.status >= 500 ||
            error.code === 'INVALID_RESPONSE')
        ) {
          setReviewRequired(true);
          setNotice('Kết quả cập nhật chưa rõ. Tải lại đơn trước khi chọn thao tác tiếp theo.');
        }
        fail(error);
      }
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return {
    page,
    setPage,
    filter,
    setFilter,
    list,
    detail,
    busy,
    saving,
    error,
    notice,
    reviewRequired,
    revision,
    refresh,
    update
  };
}
export type AdminOrders = ReturnType<typeof useAdminOrders>;
