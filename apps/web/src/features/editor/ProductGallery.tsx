import type { Shop } from '../../app/useShop';
import Card from './CardPreview';

export default function ProductGallery({
  gallery,
  setGallery,
  draft
}: Pick<Shop, 'gallery' | 'setGallery' | 'draft'>) {
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
          <Card design={draft} />
        )}
        <span className="image-caption">
          {gallery === 'sample'
            ? 'Ảnh từ tài liệu sản phẩm của nhóm'
            : 'Bản xem trước, chưa phải file in chuẩn'}
        </span>
      </div>
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
