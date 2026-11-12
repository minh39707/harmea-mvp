import { useState } from 'react';
import type { AdminOrders } from './useAdminOrders';
import { statusLabels, isOrderStatus } from '../../shared/order-status';
import { money } from '../../shared/format';
import { ordersCsvHref } from './client';
export default function OrderList({
  orders,
  open
}: {
  orders: AdminOrders;
  open: (id: string) => void;
}) {
  const list = orders.list;
  const [searchDraft, setSearchDraft] = useState(orders.orderNumber);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
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
        <form
          className="admin-search-form"
          onSubmit={event => {
            event.preventDefault();
            orders.setOrderNumber(searchDraft.trim().toUpperCase());
            orders.setPage(1);
          }}
        >
          <label>
            Mã đơn
            <input
              value={searchDraft}
              maxLength={19}
              autoComplete="off"
              placeholder="HM-…"
              onChange={event => setSearchDraft(event.target.value)}
            />
          </label>
          <button className="button secondary" type="submit" disabled={orders.busy}>
            Tìm đơn
          </button>
          {orders.orderNumber && (
            <button
              className="button secondary"
              type="button"
              disabled={orders.busy}
              onClick={() => {
                setSearchDraft('');
                orders.setOrderNumber('');
                orders.setPage(1);
              }}
            >
              Xóa tìm kiếm
            </button>
          )}
        </form>
        <button
          className="button secondary"
          disabled={orders.busy}
          onClick={() => void orders.refresh()}
        >
          Làm mới danh sách
        </button>
      </div>
      <div className="admin-toolbar">
        <label>
          Từ ngày
          <input type="date" value={from} onChange={event => setFrom(event.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={event => setTo(event.target.value)} />
        </label>
        <a className="button secondary" href={ordersCsvHref(orders.filter, from, to)}>
          Tải CSV
        </a>
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
