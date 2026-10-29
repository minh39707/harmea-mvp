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
        <span className="image-tag">
          {gallery === 'sample' ? 'THẺ MẪU THỰC TẾ' : 'THIẾT KẾ MINH HỌA'}
        </span>
        {gallery === 'sample' ? (
          <img
            src="/images/card-sample.png"
            alt="Ảnh thẻ NFC mẫu được nhóm cung cấp trong tài liệu Harméa"
          />
        ) : (
          <Card design={draft} guides={guides} />
        )}
        <span className="image-caption">
          {gallery === 'sample'
            ? 'Ảnh từ tài liệu sản phẩm của nhóm'
            : 'Bản xem trước, chưa phải file in chuẩn'}
        </span>
      </div>
      {gallery === 'preview' && (
        <div className="artwork-info">
          <label>
            <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />
            Hiện đường cắt và vùng an toàn (chỉ để đối chiếu)
          </label>
          <p>
            Thẻ 54 × 86 mm · artwork 57 × 90 mm · vùng an toàn 49 × 82 mm. PNG minh họa, chưa phải
            file in chuẩn.
          </p>
        </div>
      )}
      <div className="gallery-controls">
        <button
          className={gallery === 'sample' ? 'selected' : ''}
          onClick={() => setGallery('sample')}
        >
          <img src="/images/card-sample.png" alt="" />
          <span>Ảnh thẻ thật</span>
        </button>
        <button
          className={gallery === 'preview' ? 'selected' : ''}
          onClick={() => setGallery('preview')}
        >
          <span className="swatch-card">h♪</span>
          <span>Xem cá nhân hóa</span>
        </button>
        <span className="gallery-note">
          Âm nhạc của bạn.
          <br />
          Một món quà rất riêng.
        </span>
      </div>
    </div>
  );
}
