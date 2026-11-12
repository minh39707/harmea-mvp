import type { Shop } from '../../app/useShop';
import Card from '../editor/CardPreview';
import Quantity from '../../shared/ui/Quantity';
import { blankDesign as blank } from '../../shared/types';
import type { Item } from '../../shared/types';
import { money, colorLabel } from '../../shared/format';
import { hasLowPrintResolution } from '../editor/photo-processing';
import {
  IconVinyl,
  IconMusic,
  IconEdit,
  IconTrash,
  IconPlus,
  IconCard,
  IconShield,
  IconCheck
} from '../../shared/ui/Icons';
import './CartPage.css';

type CartPageProps = Pick<
  Shop,
  | 'cart'
  | 'go'
  | 'edit'
  | 'setCart'
  | 'product'
  | 'setDraft'
  | 'setEditing'
  | 'setEditingPosition'
  | 'setQuantity'
  | 'count'
  | 'subtotal'
> & {
  selectedItemIds?: string[];
  toggleSelectItem?: (id: string) => void;
  selectAll?: (select: boolean) => void;
  selectedItems?: Item[];
  selectedCount?: number;
  selectedSubtotal?: number;
};

export default function CartPage({
  cart,
  go,
  edit,
  setCart,
  product,
  setDraft,
  setEditing,
  setEditingPosition,
  setQuantity,
  count,
  subtotal,
  selectedItemIds = cart.map(i => i.id),
  toggleSelectItem,
  selectAll,
  selectedItems = cart.filter(i => selectedItemIds.includes(i.id)),
  selectedCount = selectedItems.reduce((n, i) => n + i.quantity, 0),
  selectedSubtotal = selectedItems.reduce(
    (n, i) => n + i.quantity * (product?.unitPriceVnd ?? 89000),
    0
  )
}: CartPageProps) {
  const unitPrice = product?.unitPriceVnd ?? 89000;
  const isAllSelected = cart.length > 0 && selectedItems.length === cart.length;
  const isSomeSelected = selectedItems.length > 0 && selectedItems.length < cart.length;

  const handleAddNewDesign = () => {
    setDraft({ ...blank });
    setEditing(null);
    setEditingPosition(null);
    setQuantity(1);
    go('product');
  };

  return (
    <section className="cart-page-section">
      <div className="cart-header">
        <div className="cart-title-wrap">
          <h1>Giỏ hàng</h1>
          {cart.length > 0 && <span className="cart-count-badge">{count} thẻ</span>}
        </div>
        {cart.length > 0 && (
          <button className="btn-add-more-top" onClick={handleAddNewDesign}>
            <span>+</span> Thiết kế thêm thẻ mới
          </button>
        )}
      </div>

      {!cart.length ? (
        <div className="cart-empty-state">
          <div className="empty-icon-box">
            <IconVinyl size={56} strokeWidth={1.5} />
          </div>
          <h2>Giỏ hàng của bạn đang trống</h2>
          <p>Hãy bắt đầu tạo chiếc thẻ NFC lưu giữ giai điệu và khoảnh khắc đáng nhớ của bạn.</p>
          <button className="btn-explore-cards" onClick={() => go('product')}>
            Khám phá & Thiết kế thẻ Harméa ↗
          </button>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items-column">
            {/* Thanh công cụ chọn thẻ mua (Toolbar) */}
            <div className="cart-selection-bar">
              <div className="selection-bar-left">
                <label className="select-all-label">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={el => {
                      if (el) el.indeterminate = isSomeSelected;
                    }}
                    onChange={() => selectAll?.(!isAllSelected)}
                    className="sr-only-input"
                  />
                  <span
                    className={`custom-checkbox-box ${isAllSelected ? 'checked' : isSomeSelected ? 'partial' : ''}`}
                  >
                    {isAllSelected && <IconCheck size={13} strokeWidth={3} />}
                    {isSomeSelected && <span className="partial-bar" />}
                  </span>
                  <span className="select-all-title">Chọn tất cả ({cart.length} thiết kế)</span>
                </label>
                <span className="selection-stats-pill">
                  Đã chọn: <strong>{selectedCount}</strong> / {count} thẻ
                </span>
              </div>

              <div className="selection-bar-right">
                <button
                  type="button"
                  className="btn-select-chip"
                  onClick={() => selectAll?.(true)}
                  disabled={isAllSelected}
                >
                  Chọn tất cả
                </button>
                <button
                  type="button"
                  className="btn-select-chip"
                  onClick={() => selectAll?.(false)}
                  disabled={selectedItemIds.length === 0}
                >
                  Bỏ chọn
                </button>
              </div>
            </div>

            <div className="cart-items-list">
              {cart.map((item, index) => {
                const colorKey = item.design.color || 'cream';
                const itemTotal = unitPrice * item.quantity;
                const displayName = item.design.fullName?.trim() || 'Thẻ Harméa';
                const musicText = item.design.musicUrl?.trim();
                const isSelected = selectedItemIds.includes(item.id);
                const lowPrintResolution =
                  Boolean(item.design.photo) &&
                  hasLowPrintResolution(
                    item.design.photoWidth,
                    item.design.photoHeight,
                    item.design.crop
                  );

                return (
                  <article
                    className={`cart-item-card color-${colorKey} ${isSelected ? 'is-selected' : 'is-unselected'}`}
                    key={item.id}
                  >
                    {/* Header chọn thẻ mua & màu sắc thẻ */}
                    <div className="cart-item-select-bar">
                      <label className="item-select-checkbox-label">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem?.(item.id)}
                          className="sr-only-input"
                        />
                        <span className={`custom-checkbox-box ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <IconCheck size={13} strokeWidth={3} />}
                        </span>
                        <span className="item-select-label-text">
                          {isSelected ? 'Đã chọn mua thẻ này' : 'Chọn thẻ này để mua'}
                        </span>
                      </label>

                      <div className="item-meta-tags">
                        <span className={`color-pill ${colorKey}`}>
                          <span className="color-swatch-dot" />
                          {colorLabel(item.design.color)}
                        </span>
                        <span className="cart-item-order">#{index + 1}</span>
                      </div>
                    </div>

                    <div className="cart-item-body">
                      {/* Left Thumbnail with hover click-to-edit */}
                      <div
                        className="cart-thumb-box"
                        onClick={() => edit(item)}
                        title="Bấm để chỉnh sửa thiết kế thẻ này"
                      >
                        <Card design={item.design} small />
                        <div className="thumb-edit-overlay">
                          <IconEdit size={13} />
                          <span>Chỉnh sửa</span>
                        </div>
                      </div>

                      {/* Middle Details */}
                      <div className="cart-copy">
                        <div className="cart-copy-meta">
                          <h3 className="cart-item-name">{displayName}</h3>
                        </div>

                        {musicText ? (
                          <div className="cart-music-tag">
                            <span className="music-tag-icon">
                              <IconMusic size={13} />
                            </span>
                            <span className="music-tag-url">
                              {musicText.length > 40 ? `${musicText.slice(0, 37)}...` : musicText}
                            </span>
                          </div>
                        ) : (
                          <div className="cart-music-tag">
                            <span className="music-tag-icon">
                              <IconMusic size={13} />
                            </span>
                            <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>
                              Chưa gắn liên kết nhạc
                            </span>
                          </div>
                        )}

                        {lowPrintResolution && (
                          <p className="cart-photo-warning">
                            Vùng ảnh đã chọn có độ phân giải thấp, thẻ in có thể bị mờ
                          </p>
                        )}

                        <div className="cart-actions">
                          <button
                            className="btn-item-action edit"
                            onClick={() => edit(item)}
                            type="button"
                          >
                            <IconEdit size={14} />
                            <span>Sửa thiết kế</span>
                          </button>
                          <button
                            className="btn-item-action remove"
                            onClick={() => setCart(old => old.filter(i => i.id !== item.id))}
                            type="button"
                          >
                            <IconTrash size={14} />
                            <span>Xóa</span>
                          </button>
                        </div>
                      </div>

                      {/* Right Quantity & Subtotal */}
                      <div className="cart-quantity-price">
                        <div className="cart-item-price">
                          <strong>{money(itemTotal)}</strong>
                          <span className="unit-price-note">{money(unitPrice)} / thẻ</span>
                        </div>
                        <Quantity
                          value={item.quantity}
                          onChange={n =>
                            setCart(old =>
                              old.map(i => (i.id === item.id ? { ...i, quantity: n } : i))
                            )
                          }
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="cart-footer-actions">
              <button className="btn-add-another-design" onClick={handleAddNewDesign} type="button">
                <IconPlus size={16} />
                <span>Thiết kế thêm một mẫu thẻ khác</span>
              </button>
              <div className="cart-device-note">
                <IconCard size={16} />
                <span>
                  Giỏ hàng lưu trên trình duyệt này; xóa dữ liệu trình duyệt sẽ mất giỏ. Bạn có thể
                  thêm tối đa 10 thẻ trong một đơn.
                </span>
              </div>
            </div>
          </div>

          {/* Sticky Order Summary Sidebar */}
          <aside className="order-summary-card">
            <h3 className="summary-title">Tóm tắt đơn hàng</h3>

            <div className="summary-rows">
              <div className="summary-row">
                <span className="row-label">Thẻ chọn mua</span>
                <span className="row-val">
                  <strong>{selectedCount}</strong> / {count} thẻ
                </span>
              </div>
              <div className="summary-row">
                <span className="row-label">Tổng tiền thẻ đã chọn</span>
                <span className="row-val">
                  <strong>{money(selectedSubtotal)}</strong>
                </span>
              </div>
              <div className="summary-row">
                <span className="row-label">Phí vận chuyển</span>
                <span className="free-badge">Chưa tính (ở bước tiếp)</span>
              </div>
            </div>

            <div className="summary-divider" />

            <div className="summary-total-row">
              <span className="total-label">Tổng thanh toán:</span>
              <strong className="total-val">{money(selectedSubtotal)}</strong>
            </div>

            <button
              className="btn-checkout-primary"
              disabled={!product || product.isActive === false || selectedItems.length === 0}
              onClick={() => go('checkout')}
              type="button"
            >
              {product?.isActive === false
                ? 'Tạm ngừng nhận đơn'
                : selectedItems.length === 0
                  ? 'Vui lòng chọn thẻ muốn mua'
                  : `Tiến hành đặt hàng (${selectedCount} thẻ) →`}
            </button>

            <div className="summary-trust-badges">
              <div className="trust-badge-item">
                <IconCheck size={14} />
                <span>Thẻ NFC chuẩn NTAG kháng nước, độ bền cao</span>
              </div>
              <div className="trust-badge-item">
                <IconCard size={14} />
                <span>In sắc nét 2 mặt, cá nhân hóa theo yêu cầu</span>
              </div>
              <div className="trust-badge-item">
                <IconShield size={14} />
                <span>Kiểm tra preview trước khi sản xuất & giao hàng</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
