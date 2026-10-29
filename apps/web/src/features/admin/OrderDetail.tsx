import type { AdminOrders } from './useAdminOrders';
import { statusLabels } from '../../shared/order-status';
import { money } from '../../shared/format';
import StatusForm from './StatusForm';
import OrderItem from './OrderItem';
const date = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function OrderDetail({
  orders,
  back,
  onUnauthorized
}: {
  orders: AdminOrders;
  back: () => void;
  onUnauthorized: () => void;
}) {
  const order = orders.detail;
  return (
    <section>
      <div className="admin-toolbar">
        <button className="button secondary" disabled={orders.saving} onClick={back}>
          ← Danh sách đơn
        </button>
        <button
          className="button secondary"
          disabled={orders.busy || orders.saving}
          onClick={() => void orders.refresh()}
        >
          Tải lại đơn
        </button>
      </div>
      {orders.busy && <p role="status">Đang tải chi tiết…</p>}
      {order && (
        <>
          <h1>{order.orderNumber}</h1>
          <p>
            {statusLabels[order.status]} · tạo {date(order.createdAt)} · cập nhật{' '}
            {date(order.updatedAt)}
          </p>
          <section className="admin-panel">
            <h2>Người nhận và tiền hàng</h2>
            <dl>
              <dt>Người nhận</dt>
              <dd>{order.recipient.name}</dd>
              <dt>Điện thoại</dt>
              <dd>{order.recipient.phone}</dd>
              <dt>Địa chỉ</dt>
              <dd>{order.recipient.address}</dd>
              <dt>Ghi chú khách</dt>
              <dd>{order.note || 'Không có'}</dd>
              <dt>Sản phẩm/mẫu</dt>
              <dd>
                {order.productSnapshot.name} · {order.templateVersion}
              </dd>
              <dt>Số thẻ</dt>
              <dd>{order.quantity}</dd>
              <dt>Đơn giá đã chốt</dt>
              <dd>{money(order.unitPriceVnd)}</dd>
              <dt>Tiền sản phẩm</dt>
              <dd>{money(order.subtotalVnd)} · phí giao hàng chưa bao gồm</dd>
              <dt>Mã vận đơn</dt>
              <dd>{order.trackingCode || 'Chưa nhập'}</dd>
              {order.cancellationReason && (
                <>
                  <dt>Lý do hủy nội bộ</dt>
                  <dd>{order.cancellationReason}</dd>
                </>
              )}
            </dl>
          </section>
          {order.items.map((item, index) => (
            <OrderItem
              key={item.id}
              item={item}
              index={index}
              orderId={order.id}
              onUnauthorized={onUnauthorized}
            />
          ))}
          {orders.reviewRequired && (
            <p className="error" role="alert">
              Cần tải lại đơn trước khi cập nhật tiếp.
            </p>
          )}
          <StatusForm
            key={`${order.id}:${order.version}:${orders.revision}`}
            order={order}
            disabled={orders.busy || orders.saving || orders.reviewRequired}
            submit={orders.update}
          />
          {orders.saving && <p role="status">Đang cập nhật…</p>}
          <section className="admin-panel">
            <h2>Lịch sử</h2>
            <ol>
              {order.history.map(event => (
                <li key={event.id}>
                  <strong>
                    {event.fromStatus ? statusLabels[event.fromStatus] + ' → ' : ''}
                    {statusLabels[event.toStatus]}
                  </strong>{' '}
                  · {date(event.occurredAt)} · {event.actor}
                  {event.internalNote && <p>Ghi chú nội bộ: {event.internalNote}</p>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </section>
  );
}
