import type { AdminOrders } from './useAdminOrders';
import { statusLabels, isOrderStatus } from '../../shared/order-status';
import { money } from '../../shared/format';
export default function OrderList({
  orders,
  open
}: {
  orders: AdminOrders;
  open: (id: string) => void;
}) {
  const list = orders.list;
  return (
    <section>
      <h1>Đơn hàng</h1>
      <div className="admin-toolbar">
        <label>
          Trạng thái
          <select
            value={orders.filter}
            disabled={orders.busy}
            onChange={e => {
              const value = e.target.value;
              if (value === '' || isOrderStatus(value)) {
                orders.setFilter(value);
                orders.setPage(1);
              }
            }}
          >
            <option value="">Tất cả</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="button secondary"
          disabled={orders.busy}
          onClick={() => void orders.refresh()}
        >
          Làm mới danh sách
        </button>
      </div>
      {orders.busy && <p role="status">Đang tải danh sách…</p>}
      {list && (
        <>
          <p>
            {list.total} đơn · trang {list.page}
          </p>
          {!list.items.length ? (
            <p>Không có đơn phù hợp bộ lọc.</p>
          ) : (
            <div className="admin-table-wrap">
              <table>
                <caption>Đơn hàng đã lưu trên hệ thống</caption>
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Người nhận</th>
                    <th>Trạng thái</th>
                    <th>Số thẻ</th>
                    <th>Tiền sản phẩm</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map(order => (
                    <tr key={order.id}>
                      <td>{order.orderNumber}</td>
                      <td>{order.recipientName}</td>
                      <td>{statusLabels[order.status]}</td>
                      <td>{order.quantity}</td>
                      <td>{money(order.subtotalVnd)}</td>
                      <td>
                        <button
                          className="button secondary"
                          disabled={orders.busy}
                          onClick={() => open(order.id)}
                        >
                          Xem đơn
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="admin-toolbar">
            <button
              className="button secondary"
              disabled={orders.busy || orders.page <= 1}
              onClick={() => orders.setPage(n => n - 1)}
            >
              Trang trước
            </button>
            <button
              className="button secondary"
              disabled={orders.busy || orders.page * list.pageSize >= list.total}
              onClick={() => orders.setPage(n => n + 1)}
            >
              Trang sau
            </button>
          </div>
        </>
      )}
    </section>
  );
}
