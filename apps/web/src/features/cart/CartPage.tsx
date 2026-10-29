import type { Shop } from '../../app/useShop';
import Card from '../editor/CardPreview';
import Quantity from '../../shared/ui/Quantity';
import { blankDesign as blank } from '../../shared/types';
import { money, colorLabel } from '../../shared/format';

export default function CartPage({
  cart,
  go,
  edit,
  setCart,
  product,
  setDraft,
  setEditing,
  setQuantity,
  count,
  subtotal
}: Pick<
  Shop,
  | 'cart'
  | 'go'
  | 'edit'
  | 'setCart'
  | 'product'
  | 'setDraft'
  | 'setEditing'
  | 'setQuantity'
  | 'count'
  | 'subtotal'
>) {
  return (
    <section className="page-section">
      <h1>Giỏ hàng</h1>
      {!cart.length ? (
        <div className="empty">
          <p>Giỏ hàng chưa có thẻ nào. Hãy bắt đầu bằng một bài hát.</p>
          <button className="button primary" onClick={() => go('product')}>
            Khám phá thẻ Harméa ↗
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div>
            {cart.map(item => (
              <article className="cart-item" key={item.id}>
                <div className="cart-thumb">
                  <Card design={item.design} small />
                </div>
                <div className="cart-copy">
                  <h3>{item.design.fullName}</h3>
                  <p>{colorLabel(item.design.color)} · Cá nhân hóa</p>
                  <div className="cart-actions">
                    <button onClick={() => edit(item)}>Sửa thiết kế</button>
                    <button onClick={() => setCart(old => old.filter(i => i.id !== item.id))}>
                      Xóa
                    </button>
                  </div>
                </div>
                <div className="cart-quantity">
                  <strong>{money((product?.unitPriceVnd ?? 0) * item.quantity)}</strong>
                  <Quantity
                    value={item.quantity}
                    onChange={n =>
                      setCart(old => old.map(i => (i.id === item.id ? { ...i, quantity: n } : i)))
                    }
                  />
                </div>
              </article>
            ))}
            <button
              className="text-button"
              onClick={() => {
                setDraft({ ...blank });
                setEditing(null);
                setQuantity(1);
                go('product');
              }}
            >
              ← Thêm một thiết kế khác
            </button>
            <p className="note">
              Thiết kế được lưu trên trình duyệt này. Xóa khỏi giỏ để xóa bản lưu trên thiết bị.
            </p>
          </div>
          <aside className="order-summary">
            <h3>Tóm tắt giỏ hàng</h3>
            <div>
              <span>Số lượng thẻ</span>
              <b>{count}</b>
            </div>
            <div>
              <span>Tiền sản phẩm</span>
              <b>{money(subtotal)}</b>
            </div>
            <div>
              <span>Phí giao hàng</span>
              <span>Chưa xác định</span>
            </div>
            <hr />
            <div className="sum">
              <span>Tạm tính</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <button className="button primary" disabled={!product} onClick={() => go('checkout')}>
              Tiếp tục đặt thử →
            </button>
            <p className="note">Demo, không thu tiền. Phí giao hàng chưa bao gồm.</p>
          </aside>
        </div>
      )}
    </section>
  );
}
