import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';

export default function CheckoutPage({
  go,
  checkout,
  recipient,
  setRecipient,
  confirmed,
  setConfirmed,
  error,
  cart,
  product,
  subtotal,
  busy,
  editorBusy,
  pendingRequestKey
}: Pick<
  Shop,
  | 'go'
  | 'checkout'
  | 'recipient'
  | 'setRecipient'
  | 'confirmed'
  | 'setConfirmed'
  | 'error'
  | 'cart'
  | 'product'
  | 'subtotal'
  | 'busy'
  | 'editorBusy'
  | 'pendingRequestKey'
>) {
  return (
    <section className="page-section">
      <button className="text-button" disabled={busy} onClick={() => go('cart')}>
        ← Quay lại giỏ hàng
      </button>
      <p className="eyebrow">CHECKOUT THỬ · KHÔNG THANH TOÁN</p>
      <h1>
        Gửi một điều <em>đặc biệt.</em>
      </h1>
      <form className="checkout-layout" onSubmit={checkout} aria-busy={busy}>
        <fieldset className="checkout-fields" disabled={busy}>
          <h3>Thông tin người nhận</h3>
          <p className="muted">Hãy dùng thông tin giả khi thử quy trình này.</p>
          <div className="two-fields">
            <label>
              Họ tên *
              <input
                required
                maxLength={80}
                autoComplete="name"
                value={recipient.name}
                onChange={e => setRecipient({ ...recipient, name: e.target.value })}
              />
            </label>
            <label>
              Số điện thoại *
              <input
                required
                type="tel"
                maxLength={16}
                minLength={8}
                pattern="[+]?[0-9]{8,15}"
                autoComplete="tel"
                value={recipient.phone}
                onChange={e => setRecipient({ ...recipient, phone: e.target.value })}
                placeholder="0900000000"
              />
            </label>
          </div>
          <label>
            Địa chỉ nhận hàng *
            <textarea
              required
              minLength={10}
              maxLength={500}
              autoComplete="street-address"
              rows={3}
              value={recipient.address}
              onChange={e => setRecipient({ ...recipient, address: e.target.value })}
            />
          </label>
          <label>
            Ghi chú (tùy chọn)
            <textarea
              maxLength={500}
              rows={2}
              value={recipient.note}
              onChange={e => setRecipient({ ...recipient, note: e.target.value })}
            />
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              required
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
            />
            <span>
              Tôi đã kiểm tra thiết kế và hiểu đây là{' '}
              <strong>đơn thử, không thu tiền, không giao hàng tự động</strong>.
            </span>
          </label>
          {pendingRequestKey && (
            <div className="test-note">
              Có yêu cầu chưa xác nhận kết quả. Giữ nguyên nội dung khi thử lại hoặc cung cấp mã này
              cho cửa hàng:
              <br />
              <code className="request-reference">{pendingRequestKey}</code>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
        </fieldset>
        <aside className="order-summary">
          <h3>Đơn thử của bạn</h3>
          {cart.map(i => (
            <div key={i.id}>
              <span>
                {i.design.fullName} × {i.quantity}
              </span>
              <b>{money(i.quantity * (product?.unitPriceVnd ?? 0))}</b>
            </div>
          ))}
          <hr />
          <div className="sum">
            <span>Tiền sản phẩm</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p className="fineprint">
            Chưa bao gồm phí giao hàng. Máy chủ sẽ kiểm tra lại giá khi tạo đơn.
          </p>
          <div className="test-note">Không yêu cầu thông tin ngân hàng hoặc thẻ thanh toán.</div>
          <button
            className="button primary"
            type="submit"
            disabled={busy || editorBusy || !cart.length || !product}
          >
            {busy
              ? 'Đang lưu đơn…'
              : editorBusy
                ? 'Đang chuẩn bị thiết kế…'
                : pendingRequestKey
                  ? 'Thử gửi lại cùng nội dung →'
                  : 'Xác nhận đặt thử →'}
          </button>
        </aside>
      </form>
    </section>
  );
}
