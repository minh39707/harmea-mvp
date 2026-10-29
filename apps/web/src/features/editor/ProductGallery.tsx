import { useState } from 'react';
import type { Shop } from '../../app/useShop';
import Card from './CardPreview';

export default function ProductGallery({
  gallery,
  setGallery,
  draft
}: Pick<Shop, 'gallery' | 'setGallery' | 'draft'>) {
  const [guides, setGuides] = useState(false);
  return (
    <div className="gallery">
      <div className={`hero-image ${gallery === 'preview' ? 'preview-stage' : ''}`}>
        {gallery === 'sample' ? (
          <img
            src="/images/card-sample.png"
            alt="Ảnh thẻ NFC mẫu được nhóm cung cấp trong tài liệu Harméa"
          />
        ) : (
          <Card design={draft} guides={guides} />
        )}
      </div>
      <div className="gallery-toggle" role="group" aria-label="Chọn ảnh xem trước">
        <button aria-pressed={gallery === 'sample'} onClick={() => setGallery('sample')}>
          Ảnh thật
        </button>
        <button aria-pressed={gallery === 'preview'} onClick={() => setGallery('preview')}>
          Thiết kế của bạn
        </button>
      </div>
      {gallery === 'preview' && (
        <div className="artwork-info">
          <label>
            <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />
            Hiện đường cắt và vùng an toàn (chỉ để đối chiếu)
          </label>
          <p className="note">
            Thẻ 54 × 86 mm · artwork 57 × 90 mm · vùng an toàn 49 × 82 mm. PNG minh họa, chưa phải
            file in chuẩn.
          </p>
        </div>
      )}
    </div>
  );
}
