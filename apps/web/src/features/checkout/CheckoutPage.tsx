import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';
import { IconUser } from '../../shared/ui/Icons';
import './CheckoutPage.css';

export default function CheckoutPage({
  go,
  checkout,
  recipient,
  setRecipient,
  confirmed,
  setConfirmed,
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
  | 'cart'
  | 'product'
  | 'subtotal'
  | 'busy'
  | 'editorBusy'
  | 'pendingRequestKey'
>) {
  return (
    <section className="checkout-page-wrapper">
      <button className="text-button btn-back-cart" disabled={busy} onClick={() => go('cart')}>
        ← Quay lại giỏ hàng
      </button>
      <h1>Thông tin đặt đơn</h1>
      <form className="checkout-layout" onSubmit={checkout} aria-busy={busy}>
        <fieldset className="checkout-fields" disabled={busy}>
          <div className="step-card-header">
            <IconUser size={18} color="#1b4332" />
            <h3>Thông tin người nhận</h3>
          </div>
          <p className="note">Hãy dùng thông tin giả khi thử quy trình này.</p>
          <div className="two-fields">
            <label>
              Họ tên người nhận *
              <input
                required
                maxLength={80}
                autoComplete="name"
                value={recipient.name}
                onChange={e => setRecipient({ ...recipient, name: e.target.value })}
                placeholder="Ví dụ: Nguyễn Văn An"
              />
            </label>
            <label>
              Số điện thoại liên hệ *
              <input
                required
                type="tel"
                maxLength={32}
                autoComplete="tel"
                value={recipient.phone}
                onChange={e => setRecipient({ ...recipient, phone: e.target.value })}
                placeholder="Ví dụ: 0912 345 678"
              />
            </label>
          </div>
          <label>
            Địa chỉ nhận hàng chi tiết *
            <textarea
              required
              minLength={10}
              maxLength={500}
              autoComplete="street-address"
              rows={3}
              value={recipient.address}
              onChange={e => setRecipient({ ...recipient, address: e.target.value })}
              placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
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
              Tôi đã kiểm tra thiết kế và thông tin người nhận; đồng ý gửi đơn theo nội dung này.
            </span>
          </label>
          {pendingRequestKey && (
            <div className="note pending-box">
              Có yêu cầu chưa xác nhận kết quả. Giữ nguyên nội dung khi thử lại:
              <br />
              <code className="request-reference">{pendingRequestKey}</code>
            </div>
          )}
        </fieldset>
        <aside className="order-summary">
          <h3>Đơn hàng của bạn</h3>
          <div className="summary-items-list">
            {cart.map(item => (
              <div key={item.id} className="summary-item-row">
                <span>
                  {item.design.fullName || 'Thẻ Harméa'} × {item.quantity}
                </span>
                <b>{money(item.quantity * (product?.unitPriceVnd ?? 0))}</b>
              </div>
            ))}
          </div>
          <hr className="summary-divider" />
          <div className="sum">
            <span>Tiền sản phẩm</span>
            <strong>{money(subtotal)}</strong>
          </div>
          <p className="note">
            Chưa bao gồm phí giao hàng. Máy chủ sẽ kiểm tra lại giá khi tạo đơn.
          </p>
          <button
            className="button primary btn-proceed-payment"
            type="submit"
            disabled={busy || editorBusy || !cart.length || !product || product.isActive === false}
          >
            {busy
              ? 'Đang lưu đơn…'
              : editorBusy
                ? 'Đang chuẩn bị thiết kế…'
                : product?.isActive === false
                  ? 'Tạm ngừng nhận đơn'
                  : pendingRequestKey
                    ? 'Thử gửi lại cùng nội dung →'
                    : 'Xác nhận đặt thử →'}
          </button>
          <p className="note summary-footer-note">
            Demo, không thu tiền và không giao hàng tự động.
          </p>
        </aside>
      </form>
    </section>
  );
}
