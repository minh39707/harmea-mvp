import type { Shop } from '../../app/useShop';
import Quantity from '../../shared/ui/Quantity';
import Bag from '../../shared/ui/BagIcon';
import OptionalFields from './OptionalFields';
import { colorLabel } from '../../shared/format';

export default function DesignForm({
  add,
  draft,
  update,
  photo,
  quantity,
  setQuantity,
  product,
  editing,
  updateCrop,
  exportPreview,
  editorBusy
}: Pick<
  Shop,
  | 'add'
  | 'draft'
  | 'update'
  | 'photo'
  | 'error'
  | 'quantity'
  | 'setQuantity'
  | 'product'
  | 'editing'
  | 'updateCrop'
  | 'exportPreview'
  | 'editorBusy'
>) {
  return (
    <form id="personalize" onSubmit={add} aria-busy={editorBusy}>
      <fieldset className="editor-fields" disabled={editorBusy}>
        <div className="color-row">
          <span>Màu thiết kế</span>
          {[
            ['cream', 'Kem kỷ niệm'],
            ['blue', 'Xanh bình yên'],
            ['rose', 'Hồng dịu dàng']
          ].map(([color, label]) => (
            <button
              type="button"
              key={color}
              className={`color ${color} ${draft.color === color ? 'chosen' : ''}`}
              aria-label={label}
              aria-pressed={draft.color === color}
              onClick={() => update('color', color!)}
              title={label}
            />
          ))}
          <small>{colorLabel(draft.color)}</small>
        </div>
        <div className="two-fields">
          <label>
            <span>Tên trên thẻ *</span>
            <input
              required
              maxLength={80}
              value={draft.fullName}
              onChange={e => update('fullName', e.target.value)}
              placeholder="Người bạn muốn gửi tặng"
            />
          </label>
          <label>
            <span>Link bài hát / playlist *</span>
            <input
              required
              type="url"
              maxLength={2048}
              value={draft.musicUrl}
              onChange={e => update('musicUrl', e.target.value)}
              placeholder="https://open.spotify.com/…"
            />
          </label>
        </div>
        <OptionalFields draft={draft} update={update} photo={photo} updateCrop={updateCrop} />
        <div className="add-row">
          <Quantity value={quantity} onChange={setQuantity} />
          <button className="button primary" disabled={!product} type="submit">
            <Bag />
            {editorBusy ? 'Đang chuẩn bị…' : editing ? 'Lưu thay đổi' : 'Thêm vào giỏ hàng'}
            <span>↗</span>
          </button>
        </div>
        <p className="note">Demo, không thu tiền. Phí giao hàng chưa bao gồm.</p>
        <button type="button" className="button secondary" onClick={() => void exportPreview()}>
          Tải preview PNG
        </button>
        {editorBusy && <p role="status">Đang đọc ảnh hoặc tạo preview PNG…</p>}
      </fieldset>
    </form>
  );
}
