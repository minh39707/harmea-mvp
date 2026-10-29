import type { Shop } from '../../app/useShop';
import CropControls from './CropControls';
export default function OptionalFields({
  draft,
  update,
  photo,
  updateCrop
}: Pick<Shop, 'draft' | 'update' | 'photo' | 'updateCrop'>) {
  return (
    <details className="personal-details">
      <summary>
        Chọn ảnh (bắt buộc), chữ ký và ngày <span>+</span>
      </summary>
      <div className="two-fields">
        <label>
          Ảnh của bạn *{' '}
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              void photo(file);
            }}
          />
          <small>JPG / PNG, tối đa 5 MiB; giữ riêng ảnh gốc</small>
        </label>
        <label>
          Chữ ký dạng chữ
          <input
            maxLength={80}
            value={draft.signatureText}
            onChange={e => update('signatureText', e.target.value)}
            placeholder="with love, Minh"
          />
        </label>
        <label>
          Địa điểm
          <input
            maxLength={120}
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
      <CropControls draft={draft} onChange={updateCrop} />
    </details>
  );
}
