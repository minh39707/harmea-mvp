import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';

export default function TrackingPage({
  lookup,
  trackInput,
  setTrackInput,
  busy,
  error,
  receipt
}: Pick<Shop, 'lookup' | 'trackInput' | 'setTrackInput' | 'busy' | 'error' | 'receipt'>) {
  return (
    <section className="tracking page-section">
      <p className="eyebrow">HÀNH TRÌNH CỦA MỘT KỶ NIỆM</p>
      <h1>
        Theo dõi <em>đơn thử.</em>
      </h1>
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
            value={trackInput}
            onChange={e => setTrackInput(e.target.value)}
            placeholder="Dán liên kết bạn đã nhận sau checkout"
          />
        </label>
        <button className="button primary" disabled={busy}>
          {busy ? 'Đang tra cứu…' : 'Tra cứu đơn →'}
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {receipt && (
        <div className="tracking-result">
          <span className="status">● Đã nhận đơn thử</span>
          <h2>{receipt.orderNumber}</h2>
          <p>Tạo lúc {new Date(receipt.createdAt).toLocaleString('vi-VN')}</p>
          <p>
            Tiền sản phẩm: <strong>{money(receipt.subtotalVnd)}</strong>
          </p>
          <div className="test-note">
            Đơn đã được lưu. Bản demo chưa xử lý sản xuất hoặc vận chuyển và không thu tiền. Không
            có thông tin người nhận hay ảnh cá nhân trên trang này.
          </div>
        </div>
      )}
    </section>
  );
}
