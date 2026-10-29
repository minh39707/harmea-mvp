import type { Shop } from '../../app/useShop';
import Quantity from '../../shared/ui/Quantity';
import Bag from '../../shared/ui/BagIcon';
import { colorLabel } from '../../shared/format';

export default function DesignForm({
  add,
  draft,
  update,
  photo,
  error,
  quantity,
  setQuantity,
  product,
  editing
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
>) {
  return (
    <form id="personalize" onSubmit={add}>
      <div className="form-heading">
        <span>01 / TẠO DẤU ẤN RIÊNG</span>
        <small>Một thiết kế cho mỗi dòng giỏ</small>
      </div>
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
          Tên trên thẻ <span>*</span>
          <input
            required
            maxLength={60}
            value={draft.fullName}
            onChange={e => update('fullName', e.target.value)}
            placeholder="Người bạn muốn gửi tặng"
          />
        </label>
        <label>
          Link bài hát / playlist <span>*</span>
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
      <details className="personal-details">
        <summary>
          Thêm ảnh, chữ ký & ngày kỷ niệm <span>+</span>
        </summary>
        <div className="two-fields">
          <label>
            Ảnh của bạn{' '}
            <input
              type="file"
              accept="image/jpeg,image/png"
              onChange={e => void photo(e.target.files?.[0])}
            />
            <small>JPG / PNG, tối đa 5 MB</small>
          </label>
          <label>
            Chữ ký dạng chữ
            <input
              maxLength={40}
              value={draft.signatureText}
              onChange={e => update('signatureText', e.target.value)}
              placeholder="with love, Minh"
            />
          </label>
          <label>
            Địa điểm
            <input
              maxLength={80}
              value={draft.place}
              onChange={e => update('place', e.target.value)}
              placeholder="Một nơi đáng nhớ"
            />
          </label>
          <label>
            Ngày kỷ niệm
            <input
              type="date"
              value={draft.commemorativeDate}
              onChange={e => update('commemorativeDate', e.target.value)}
            />
          </label>
          <label>
            Ngày sinh (tùy chọn)
            <input
              type="date"
              value={draft.dateOfBirth}
              onChange={e => update('dateOfBirth', e.target.value)}
            />
          </label>
          {draft.photo && (
            <button type="button" className="text-button" onClick={() => update('photo', '')}>
              Bỏ ảnh đã chọn
            </button>
          )}
        </div>
      </details>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="add-row">
        <Quantity value={quantity} onChange={setQuantity} />
        <button className="button primary" disabled={!product} type="submit">
          <Bag />
          {editing ? 'Lưu thay đổi' : 'Thêm vào giỏ hàng'}
          <span>↗</span>
        </button>
      </div>
      <p className="fineprint">
        Chưa thu tiền khi đặt thử. Phí giao hàng chưa bao gồm.
        <br />
        Màu và bố cục xem trước là phương án minh họa, cần xác nhận trước khi in.
      </p>
    </form>
  );
}
