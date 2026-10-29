import { useState } from 'react';
import type { AdminDetail, StatusDraft } from './types';
import type { OrderStatus } from '../../shared/types';
import { nextStatuses } from './client';
import { statusLabels, isOrderStatus } from '../../shared/order-status';
export default function StatusForm({
  order,
  disabled,
  submit
}: {
  order: AdminDetail;
  disabled: boolean;
  submit: (draft: StatusDraft) => Promise<void>;
}) {
  const [status, setStatus] = useState<OrderStatus | ''>(''),
    [reason, setReason] = useState(''),
    [trackingCode, setTrackingCode] = useState(''),
    [confirmed, setConfirmed] = useState(false);
  const allowed = nextStatuses[order.status];
  if (!allowed.length)
    return (
      <section className="admin-panel">
        <h2>Trạng thái cuối</h2>
        <p>Đơn {statusLabels[order.status].toLowerCase()}, không có thao tác mở lại.</p>
      </section>
    );
  return (
    <form
      className="admin-panel"
      onSubmit={e => {
        e.preventDefault();
        if (status) void submit({ status, reason, trackingCode, confirmed });
      }}
    >
      <h2>Cập nhật tiến độ</h2>
      <p>
        Hiện tại: {statusLabels[order.status]} · phiên bản {order.version}
      </p>
      <fieldset disabled={disabled}>
        <label>
          Trạng thái tiếp theo
          <select
            required
            value={status}
            onChange={e => {
              const value = e.target.value;
              if (value === '' || isOrderStatus(value)) {
                setStatus(value);
                setConfirmed(false);
                setReason('');
                setTrackingCode('');
              }
            }}
          >
            <option value="">Chọn thao tác</option>
            {allowed.map(value => (
              <option key={value} value={value}>
                {statusLabels[value]}
              </option>
            ))}
          </select>
        </label>
        {status === 'cancelled' && (
          <label>
            Lý do hủy (nội bộ, bắt buộc)
            <textarea
              required
              maxLength={500}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </label>
        )}
        {status === 'shipping' && (
          <label>
            Mã vận đơn (nếu có)
            <input
              maxLength={80}
              value={trackingCode}
              onChange={e => setTrackingCode(e.target.value)}
            />
          </label>
        )}
        <label className="admin-check">
          <input
            type="checkbox"
            required
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
          />
          <span>
            Tôi đã đối chiếu đơn và xác nhận thao tác này.
            {status === 'shipping' ? ' Tôi đã kiểm tra thành phẩm/NFC ngoài hệ thống.' : ''}
          </span>
        </label>
        <button className="button primary" type="submit" disabled={!status}>
          Xác nhận cập nhật
        </button>
      </fieldset>
    </form>
  );
}
