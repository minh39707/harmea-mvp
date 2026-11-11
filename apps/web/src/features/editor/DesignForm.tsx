import type { Shop } from '../../app/useShop';
import Quantity from '../../shared/ui/Quantity';
import OptionalFields from './OptionalFields';
import { hasLowPrintResolution } from './photo-processing';
import { money } from '../../shared/format';
import {
  IconCard,
  IconPalette,
  IconUser,
  IconLink,
  IconCheck,
  IconShoppingCart,
  IconChevronDown
} from '../../shared/ui/Icons';

export default function DesignForm({
  add,
  addAsNew,
  draft,
  update,
  photo,
  quantity,
  setQuantity,
  product,
  editing,
  editingPosition,
  cart,
  edit,
  startNewDesign,
  updateCrop,
  exportPreview,
  editorBusy,
  photoStats,
  saveStatus,
  setGallery
}: Pick<
  Shop,
  | 'add'
  | 'addAsNew'
  | 'draft'
  | 'update'
  | 'photo'
  | 'error'
  | 'quantity'
  | 'setQuantity'
  | 'product'
  | 'editing'
  | 'editingPosition'
  | 'cart'
  | 'edit'
  | 'startNewDesign'
  | 'updateCrop'
  | 'exportPreview'
  | 'editorBusy'
  | 'photoStats'
  | 'saveStatus'
  | 'setGallery'
>) {
  const editingIndex = editing ? cart.findIndex(item => item.id === editing) : -1;
  const editingMissing = Boolean(editing && editingIndex < 0);
  const lowPrintResolution =
    Boolean(draft.photo) && hasLowPrintResolution(draft.photoWidth, draft.photoHeight, draft.crop);

  function handleTextChange(field: keyof typeof draft, val: string) {
    update(field, val);
    setGallery('preview');
  }

  function handleColorChange(color: string) {
    update('color', color);
    setGallery('preview');
  }

  function handleSelectCard(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (val === 'new') {
      startNewDesign();
    } else {
      const item = cart.find(item => item.id === val);
      if (item) {
        void edit(item);
      }
    }
  }

  return (
    <form id="personalize" className="product-form-card" onSubmit={add} aria-busy={editorBusy}>
      <fieldset className="form-fieldset" disabled={editorBusy}>
        {/* 1. THẺ THIẾT KẾ & GIÁ THẺ (50.000 ₫) */}
        <div className="field-section">
          <div className="section-label-row card-title-price-row">
            <div className="label-with-icon">
              <IconCard size={17} color="#1b4332" />
              <label htmlFor="card-select" className="section-title">
                Thẻ thiết kế
              </label>
            </div>
            <div className="card-price-badge" title="Giá trải nghiệm demo">
              <span className="price-value">
                {product ? money(product.unitPriceVnd) : '50.000 ₫'}
              </span>
              <span className="price-unit">/ thẻ</span>
            </div>
          </div>
          <div className="card-select-container">
            <select
              id="card-select"
              className="card-select-control"
              value={editing ?? 'new'}
              onChange={handleSelectCard}
            >
              <option value="new">Thẻ mới</option>
              {cart.map((item, idx) => (
                <option key={item.id} value={item.id}>
                  Thẻ #{idx + 1}: {item.design.fullName || 'Chưa đặt tên'} ({item.quantity} bản)
                </option>
              ))}
            </select>
            <span className="select-chevron-icon" aria-hidden="true">
              <IconChevronDown size={16} color="#444444" />
            </span>
          </div>
          <div className="card-two-sides-note">
            <IconCard size={13} color="#1b4332" />
            <span>Hai mặt thẻ được in đồng bộ cùng một thiết kế</span>
          </div>
          {editingMissing && (
            <p className="editor-warning" role="status">
              Thẻ này đã bị xóa ở tab khác. Bạn có thể lưu thiết kế hiện tại thành thẻ mới.
            </p>
          )}
        </div>

        {/* 2. MÀU THIẾT KẾ (3 MẪU TRÒN KEM, XANH, HỒNG VỚI VÒNG XANH VÀ DẤU TÍCH CHO MÀU ĐANG CHỌN) */}
        <div className="field-section">
          <div className="section-label-row">
            <IconPalette size={17} color="#1b4332" />
            <span className="section-title">Màu thiết kế</span>
          </div>
          <div className="swatch-group" role="radiogroup" aria-label="Chọn màu thẻ">
            {[
              { id: 'cream', label: 'Kem kỷ niệm', hex: '#eadaad' },
              { id: 'blue', label: 'Xanh bình yên', hex: '#7ca5cf' },
              { id: 'rose', label: 'Hồng dịu dàng', hex: '#e5a4af' }
            ].map(swatch => {
              const isSelected = draft.color === swatch.id;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  className={`color-swatch-circle ${swatch.id} ${isSelected ? 'active' : ''}`}
                  onClick={() => handleColorChange(swatch.id)}
                  title={swatch.label}
                  aria-label={swatch.label}
                  style={{ backgroundColor: swatch.hex }}
                >
                  {isSelected && (
                    <span className="swatch-checkmark" aria-hidden="true">
                      <IconCheck size={16} strokeWidth={2.5} color="#1b4332" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. LƯỚI 2 CỘT: TÊN TRÊN THẺ & LINK BÀI HÁT / PLAYLIST */}
        <div className="two-col-inputs">
          <div className="input-group">
            <div className="section-label-row">
              <IconUser size={17} color="#1b4332" />
              <label htmlFor="card-full-name" className="section-title">
                Tên trên thẻ *
              </label>
            </div>
            <input
              id="card-full-name"
              required
              maxLength={80}
              className="styled-text-input"
              value={draft.fullName}
              onChange={e => handleTextChange('fullName', e.target.value)}
              placeholder="Người bạn muốn gửi tặng"
            />
          </div>

          <div className="input-group">
            <div className="section-label-row">
              <IconLink size={17} color="#1b4332" />
              <label htmlFor="card-music-url" className="section-title">
                Link bài hát / playlist *
              </label>
            </div>
            <input
              id="card-music-url"
              required
              type="url"
              maxLength={2048}
              className="styled-text-input"
              value={draft.musicUrl}
              onChange={e => handleTextChange('musicUrl', e.target.value)}
              placeholder="https://open.spotify.com/…"
            />
          </div>
        </div>

        {/* 4 & 5. ẢNH CỦA BẠN & THÔNG TIN BỔ SUNG (ACCORDION) */}
        <OptionalFields
          draft={draft}
          update={update}
          photo={photo}
          photoStats={photoStats}
          updateCrop={updateCrop}
          setGallery={setGallery}
        />

        {lowPrintResolution && (
          <p className="editor-warning" role="status">
            Vùng ảnh đã chọn có độ phân giải thấp, thẻ in có thể bị mờ
          </p>
        )}

        {/* 6. HÀNG HÀNH ĐỘNG: SỐ LƯỢNG [- 1 +] & NÚT LƯU VÀO GIỎ (#1b4332) */}
        <div className="action-bar-row">
          <Quantity value={quantity} onChange={setQuantity} />
          {editing && !editingMissing ? (
            <div className="edit-action-buttons">
              <button className="btn-primary-add" disabled={!product || editorBusy} type="submit">
                <IconShoppingCart size={18} color="#ffffff" />
                <span>{editorBusy ? 'Đang lưu…' : 'Cập nhật thẻ này'}</span>
              </button>
              <button
                className="btn-secondary-new"
                disabled={!product || editorBusy}
                onClick={() => void addAsNew()}
                type="button"
              >
                Lưu thành thẻ mới
              </button>
            </div>
          ) : (
            <button className="btn-primary-add" disabled={!product || editorBusy} type="submit">
              <IconShoppingCart size={18} color="#ffffff" />
              <span>{editorBusy ? 'Đang lưu…' : 'Lưu vào giỏ'}</span>
            </button>
          )}
        </div>

        {saveStatus && (
          <p className="save-status-msg" role="status">
            {saveStatus}
          </p>
        )}

        <div className="form-footer-tools">
          <button
            type="button"
            className="btn-download-preview"
            onClick={() => void exportPreview()}
          >
            Tải preview PNG
          </button>
          <span className="cart-save-tip">
            Demo trải nghiệm, thiết kế lưu trên trình duyệt của bạn.
          </span>
        </div>
      </fieldset>
    </form>
  );
}
