import { useState, useEffect, useCallback } from 'react';
import type { Shop } from '../../app/useShop';
import Card from './CardPreview';
import { colorLabel } from '../../shared/format';
import {
  IconExpand,
  IconChevronLeft,
  IconChevronRight,
  IconImage,
  IconCheck,
  IconClose,
  IconCard
} from '../../shared/ui/Icons';

export const COLOR_SAMPLES = [
  {
    id: 'cream',
    src: '/images/card-sample-cream.jpg',
    title: 'Màu Kem kỷ niệm',
    label: 'Kem kỷ niệm',
    artist: 'The Weeknd — The Idol'
  },
  {
    id: 'blue',
    src: '/images/card-sample-blue.jpg',
    title: 'Màu Xanh bình yên',
    label: 'Xanh bình yên',
    artist: 'Drake — Nothing Was The Same'
  },
  {
    id: 'rose',
    src: '/images/card-sample-rose.jpg',
    title: 'Màu Hồng dịu dàng',
    label: 'Hồng dịu dàng',
    artist: 'Kendrick Lamar — DAMN.'
  }
];

export default function ProductGallery({
  gallery,
  setGallery,
  draft
}: Pick<Shop, 'gallery' | 'setGallery' | 'draft'>) {
  const [guides, setGuides] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const activePhoto = COLOR_SAMPLES[activePhotoIndex] || COLOR_SAMPLES[0]!;

  const handleNextPhoto = useCallback(() => {
    setActivePhotoIndex(prev => (prev + 1) % COLOR_SAMPLES.length);
    if (gallery !== 'sample') {
      setGallery('sample');
    }
  }, [gallery, setGallery]);

  const handlePrevPhoto = useCallback(() => {
    setActivePhotoIndex(prev => (prev - 1 + COLOR_SAMPLES.length) % COLOR_SAMPLES.length);
    if (gallery !== 'sample') {
      setGallery('sample');
    }
  }, [gallery, setGallery]);

  useEffect(() => {
    if (!isLightboxOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (gallery === 'sample') {
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, gallery, handleNextPhoto, handlePrevPhoto]);

  function selectPhoto(index: number) {
    setActivePhotoIndex(index);
    if (gallery !== 'sample') {
      setGallery('sample');
    }
  }

  return (
    <div className="product-gallery-card">
      {/* 1. KHUNG PREVIEW TRÊN NỀN XÁM NHẸ VỚI NÚT PHÓNG TO VÀ ĐIỀU HƯỚNG */}
      <div className="gallery-preview-box">
        {/* Nút phóng to ở góc trên bên phải */}
        <button
          type="button"
          className="btn-expand-preview"
          onClick={() => setIsLightboxOpen(true)}
          title={
            gallery === 'preview'
              ? 'Phóng to kiểm tra chi tiết thiết kế thẻ'
              : 'Phóng to xem ảnh mẫu chi tiết'
          }
          aria-label="Phóng to ảnh"
        >
          <IconExpand size={16} />
        </button>

        {/* Nút mũi tên chuyển ảnh (chỉ hiển thị khi xem ảnh mẫu) */}
        {gallery === 'sample' && (
          <>
            <button
              type="button"
              className="gallery-nav-arrow prev"
              onClick={handlePrevPhoto}
              aria-label="Ảnh trước"
              title="Xem ảnh mẫu trước"
            >
              <IconChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="gallery-nav-arrow next"
              onClick={handleNextPhoto}
              aria-label="Ảnh sau"
              title="Xem ảnh mẫu tiếp theo"
            >
              <IconChevronRight size={18} />
            </button>
          </>
        )}

        {/* Vùng hiển thị thẻ chính giữa */}
        <div className="gallery-display-center">
          {gallery === 'sample' ? (
            <div
              className="hero-image-clickable"
              onClick={() => setIsLightboxOpen(true)}
              title="Nhấn để phóng to xem chi tiết ảnh mẫu"
            >
              <img src={activePhoto.src} alt={activePhoto.title} className="card-sample-img" />
            </div>
          ) : (
            <div
              className="hero-card-clickable"
              onClick={() => setIsLightboxOpen(true)}
              title="Nhấn để phóng to kiểm tra chi tiết tiến trình thiết kế thẻ của bạn"
            >
              <Card design={draft} guides={guides} />
              <div className="card-zoom-hint">
                <IconExpand size={13} />
                <span>Phóng to kiểm tra</span>
              </div>
            </div>
          )}
        </div>

        {/* Ghi chú 2 mặt thẻ giống nhau */}
        <div className="card-two-sides-pill">
          <IconCard size={14} color="var(--brand)" />
          <span>Hai mặt thẻ được in đồng bộ giống nhau</span>
        </div>

        {/* 3 chấm chuyển trang (carousel dots) ở đáy khung preview khi ở tab mẫu */}
        {gallery === 'sample' && (
          <div className="carousel-dots" role="tablist" aria-label="Danh sách ảnh mẫu">
            {COLOR_SAMPLES.map((photo, idx) => {
              const isDotActive = activePhotoIndex === idx;
              return (
                <button
                  key={photo.id}
                  type="button"
                  role="tab"
                  aria-selected={isDotActive}
                  className={`carousel-dot ${isDotActive ? 'active' : ''}`}
                  onClick={() => selectPhoto(idx)}
                  title={`Chuyển đến mẫu ${photo.label}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* 2. KHU VỰC "CHỌN ẢNH MẪU" DƯỚI KHUNG PREVIEW */}
      <div className="gallery-sample-section">
        <div className="sample-section-header">
          <IconImage size={18} color="var(--brand)" />
          <span className="sample-section-title">Chọn ảnh mẫu</span>
        </div>

        <div className="sample-grid" role="group" aria-label="3 ảnh mẫu với 3 màu">
          {COLOR_SAMPLES.map((photo, idx) => {
            const isSelected = gallery === 'sample' && activePhotoIndex === idx;
            return (
              <button
                key={photo.id}
                type="button"
                className={`sample-card-item ${isSelected ? 'active' : ''}`}
                onClick={() => selectPhoto(idx)}
                title={`Xem mẫu ${photo.label}`}
              >
                {isSelected && (
                  <span className="sample-check-badge" aria-hidden="true">
                    <IconCheck size={12} strokeWidth={2.5} />
                  </span>
                )}
                <div className="sample-thumb-img-wrap">
                  <img src={photo.src} alt={photo.title} />
                </div>
                <span className="sample-caption">{photo.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. NÚT CHUYỂN ĐỔI CHẾ ĐỘ XEM (ẢNH MẪU / THIẾT KẾ CỦA BẠN) */}
      <div className="gallery-mode-toggle" role="group" aria-label="Chọn chế độ hiển thị">
        <button
          type="button"
          className={`btn-mode-toggle ${gallery === 'sample' ? 'active' : ''}`}
          onClick={() => setGallery('sample')}
        >
          Ảnh mẫu ({COLOR_SAMPLES.length} màu)
        </button>
        <button
          type="button"
          className={`btn-mode-toggle ${gallery === 'preview' ? 'active' : ''}`}
          onClick={() => setGallery('preview')}
        >
          Thiết kế của bạn
        </button>
      </div>

      {gallery === 'preview' && (
        <div className="artwork-info-wrap">
          <div className="card-both-sides-tip">
            <span className="tip-bullet" />
            <span>
              Quy cách in: <strong>2 mặt thẻ in cùng một thiết kế giống nhau</strong>
            </span>
          </div>
          <div className="artwork-info">
            <label>
              <input type="checkbox" checked={guides} onChange={e => setGuides(e.target.checked)} />
              <span>Hiện đường cắt và vùng an toàn (chỉ để đối chiếu)</span>
            </label>
          </div>
        </div>
      )}

      {/* 4. LIGHTBOX XEM ẢNH / THIẾT KẾ TO CHI TIẾT */}
      {isLightboxOpen && (
        <div
          className="lightbox-overlay"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <button
              className="lightbox-close"
              onClick={() => setIsLightboxOpen(false)}
              aria-label="Đóng"
              title="Đóng (Esc)"
            >
              <IconClose size={22} />
            </button>

            {gallery === 'sample' ? (
              <>
                <button
                  className="lightbox-arrow prev"
                  onClick={handlePrevPhoto}
                  aria-label="Trước"
                  title="Mẫu trước"
                >
                  ‹
                </button>
                <div className="lightbox-img-box">
                  <img src={activePhoto.src} alt={activePhoto.title} />
                  <div className="lightbox-bar">
                    <strong>{activePhoto.title}</strong>
                    <span> • {activePhoto.artist}</span>
                    <span className="lightbox-counter">
                      ({activePhotoIndex + 1}/{COLOR_SAMPLES.length})
                    </span>
                  </div>
                </div>
                <button
                  className="lightbox-arrow next"
                  onClick={handleNextPhoto}
                  aria-label="Sau"
                  title="Mẫu sau"
                >
                  ›
                </button>
              </>
            ) : (
              <div className="lightbox-preview-card-box">
                <div className="lightbox-card-render-wrap">
                  <Card design={draft} guides={guides} />
                </div>
                <div className="lightbox-preview-bar">
                  <div className="lightbox-preview-info">
                    <strong className="lightbox-card-title">
                      {draft.fullName?.trim() || 'Thẻ Harméa cá nhân'}
                    </strong>
                    <span className="lightbox-card-meta">
                      Màu {colorLabel(draft.color)} • 2 mặt thẻ in giống nhau • Chuẩn kích thước thẻ
                      ATM (86 × 54 mm)
                    </span>
                  </div>
                  <label className="lightbox-guides-toggle">
                    <input
                      type="checkbox"
                      checked={guides}
                      onChange={e => setGuides(e.target.checked)}
                    />
                    <span>Hiện đường cắt & vùng an toàn</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
