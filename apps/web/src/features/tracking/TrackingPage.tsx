import type { Shop } from '../../app/useShop';
import { statusLabels } from '../../shared/order-status';
const date = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
export default function TrackingPage({
  lookup,
  trackInput,
  setTrackInput,
  trackingBusy,
  tracking
}: Pick<Shop, 'lookup' | 'trackInput' | 'setTrackInput' | 'trackingBusy' | 'error' | 'tracking'>) {
  return (
    <section className="tracking page-section">
      <h1>Tra cứu đơn</h1>
      <form
        onSubmit={e => {
          e.preventDefault();
          void lookup(trackInput);
        }}
      >
        <label>
          Liên kết theo dõi hoặc mã truy cập bí mật
          <input
            required
            disabled={trackingBusy}
            value={trackInput}
            onChange={e => setTrackInput(e.target.value)}
            placeholder="Dán liên kết nhận sau khi đặt đơn"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <button className="button primary" disabled={trackingBusy}>
          {trackingBusy ? 'Đang tra cứu…' : 'Tra cứu đơn →'}
        </button>
      </form>
      {tracking && (
        <div className="tracking-result" aria-live="polite">
          <span className="status">● {statusLabels[tracking.status]}</span>
          <h2>{tracking.orderNumber}</h2>
          <p>
            Tạo lúc {date(tracking.createdAt)}
            <br />
            Cập nhật {date(tracking.updatedAt)}
          </p>
          {tracking.trackingCode && (
            <p>
              Mã vận đơn: <strong>{tracking.trackingCode}</strong>
            </p>
          )}
          <ol className="tracking-history">
            {tracking.history.map((event, i) => (
              <li key={i}>
                <strong>{statusLabels[event.status]}</strong>
                <time dateTime={event.occurredAt}>{date(event.occurredAt)}</time>
              </li>
            ))}
          </ol>
          <button
            className="button secondary"
            disabled={trackingBusy}
            onClick={() => void lookup(trackInput)}
          >
            Làm mới tiến độ
          </button>
          <p className="note">
            Chỉ hiển thị tiến độ do cửa hàng ghi nhận; thông tin người nhận, ảnh và thiết kế được
            giữ riêng tư.
          </p>
        </div>
      )}
    </section>
  );
}
