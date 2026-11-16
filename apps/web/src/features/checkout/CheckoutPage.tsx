import { createPortal } from 'react-dom';
import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';
import {
  DELIVERY_NOTE,
  SHIPPING_FEE_SUFFIX,
  SHIPPING_FEE_VND,
  estimateDelivery
} from '../../shared/delivery';
import { IconUser } from '../../shared/ui/Icons';
import { revealOnFocus, useKeyboardInset } from '../../shared/useKeyboardInset';
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
  useKeyboardInset();
  const submitDisabled =
    busy || editorBusy || !cart.length || !product || product.isActive === false;
  const submitLabel = busy
    ? 'Đang lưu đơn…'
    : editorBusy
      ? 'Đang chuẩn bị thiết kế…'
      : product?.isActive === false
        ? 'Tạm ngừng nhận đơn'
        : pendingRequestKey
          ? 'Thử gửi lại cùng nội dung →'
          : 'Đặt đơn demo →';
  return (
    <section className="checkout-page-wrapper">
      <button className="text-button btn-back-cart" disabled={busy} onClick={() => go('cart')}>
        ← Quay lại giỏ hàng
      </button>
      <h1>Thông tin đặt đơn</h1>
      <div className="demo-alert" role="alert">
        <strong>Dự án sinh viên – website demo.</strong> Harméa là bài tập môn E-Business, không
        phải cửa hàng thật. Đơn đặt ở đây không được bán, giao hay thu tiền.
      </div>
      <form id="checkout-form" className="checkout-layout" onSubmit={checkout} aria-busy={busy}>
        <fieldset className="checkout-fields" disabled={busy} onFocus={revealOnFocus}>
          <div className="step-card-header">
            <IconUser size={18} color="var(--brand)" />
            <h3>Thông tin demo</h3>
          </div>
          <p className="note">
            Chỉ nhập dữ liệu giả để thử nghiệm. Không dùng tên, số điện thoại, địa chỉ hoặc ảnh cá
            nhân thật; nhóm không liên hệ và không giao hàng.
          </p>
          <div className="two-fields">
            <label>
              Tên demo *
              <input
                required
                maxLength={80}
                autoComplete="off"
                enterKeyHint="next"
                value={recipient.name}
                onChange={e => setRecipient({ ...recipient, name: e.target.value })}
                placeholder="Ví dụ: TEST DEMO"
              />
            </label>
            <label>
              Số điện thoại demo *
              <input
                required
                type="tel"
                inputMode="tel"
                maxLength={32}
                autoComplete="off"
                enterKeyHint="next"
                value={recipient.phone}
                onChange={e => setRecipient({ ...recipient, phone: e.target.value })}
                placeholder="Ví dụ: 0900 000 000"
              />
            </label>
          </div>
          <label>
            Địa chỉ demo *
            <textarea
              required
              minLength={10}
              maxLength={500}
              autoComplete="off"
              enterKeyHint="next"
              rows={3}
              value={recipient.address}
              onChange={e => setRecipient({ ...recipient, address: e.target.value })}
              placeholder="Ví dụ: Địa chỉ thử nghiệm, Hà Nội"
            />
          </label>
          <label>
            Ghi chú (tùy chọn)
            <textarea
              maxLength={500}
              rows={2}
              enterKeyHint="done"
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
            <span>Tôi xác nhận đây là đơn demo và các thông tin đã nhập đều là dữ liệu giả.</span>
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
          <div className="sum">
            <span>Phí vận chuyển (demo)</span>
            <strong>
              {money(SHIPPING_FEE_VND)} {SHIPPING_FEE_SUFFIX}
            </strong>
          </div>
          <div className="sum">
            <span>Tổng mô phỏng</span>
            <strong>{money(subtotal + SHIPPING_FEE_VND)}</strong>
          </div>
          <p className="note">Máy chủ sẽ kiểm tra lại giá demo khi tạo đơn.</p>
          <div className="delivery-estimate" role="note">
            <span className="delivery-estimate-label">Dự kiến giao (mô phỏng)</span>
            <strong>{estimateDelivery().label}</strong>
            <small>{DELIVERY_NOTE}</small>
          </div>
          <button
            className="button primary btn-proceed-payment"
            type="submit"
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
          <p className="note summary-footer-note">
            Sau khi lưu đơn sẽ có bước thanh toán mô phỏng. Không chuyển tiền thật.
          </p>
        </aside>
      </form>
      {/* F8: thanh đặt đơn trên mobile, luôn nằm ngay trên bàn phím (xem useKeyboardInset).
          Gắn vào <body> vì khung trang có transform làm position:fixed bám sai chỗ. */}
      {createPortal(
        <div className="mobile-action-bar">
          <div className="mobile-action-total">
            <span>Tổng mô phỏng</span>
            <strong>{money(subtotal + SHIPPING_FEE_VND)}</strong>
          </div>
          <button
            className="button primary"
            type="submit"
            form="checkout-form"
            disabled={submitDisabled}
          >
            {submitLabel}
          </button>
        </div>,
        document.body
      )}
    </section>
  );
}
