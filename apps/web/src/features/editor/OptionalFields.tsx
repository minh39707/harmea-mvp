import { useState } from 'react';
import type { Shop } from '../../app/useShop';
import CropControls from './CropControls';
import SignaturePad from './SignaturePad';
import {
  IconImage,
  IconPhotoAdd,
  IconDocument,
  IconPen,
  IconMapPin,
  IconCalendar,
  IconChevronUp,
  IconChevronDown,
  IconRefresh,
  IconTrash
} from '../../shared/ui/Icons';
import { formatImageBytes } from './photo-processing';

type OptionalFieldsProps = Pick<
  Shop,
  'draft' | 'update' | 'photo' | 'photoStats' | 'updateCrop'
> & {
  setGallery?: (gallery: 'sample' | 'preview') => void;
};

export default function OptionalFields({
  draft,
  update,
  photo,
  photoStats,
  updateCrop,
  setGallery
}: OptionalFieldsProps) {
  const [isPadOpen, setIsPadOpen] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  function handleTextChange(field: keyof typeof draft, val: string) {
    update(field, val);
    setGallery?.('preview');
  }

  function handleSaveSignature(dataUrl: string) {
    update('signatureData', dataUrl);
    update('signatureText', 'Ký tay');
    setGallery?.('preview');
  }

  function handleClearSignature() {
    update('signatureData', '');
    update('signatureText', '');
    setGallery?.('preview');
  }

  return (
    <>
      {/* 4. KHUNG TẢI ẢNH CỦA BẠN (DASHED DROPZONE THEO MOCKUP) */}
      <div className="field-section photo-upload-section">
        <div className="section-label-row">
          <IconImage size={17} color="#1b4332" />
          <span className="section-title">Ảnh của bạn *</span>
        </div>

        <label className="custom-photo-dropzone">
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only-input"
            onChange={e => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = '';
              setGallery?.('preview');
              void photo(file);
            }}
          />
          <div className="dropzone-content">
            <IconPhotoAdd size={28} color="#1b4332" />
            <div className="dropzone-text-group">
              <span className="dropzone-main-text">Chọn ảnh từ máy</span>
              <span className="dropzone-sub-text">JPG / PNG, tối đa 15 MiB</span>
            </div>
          </div>
        </label>

        {photoStats && (
          <small className="photo-stats-info" role="status">
            Dung lượng: {formatImageBytes(photoStats.sourceBytes)} →{' '}
            {photoStats.compressedBytes === undefined
              ? photoStats.failed
                ? 'không thể nén'
                : 'đang nén…'
              : formatImageBytes(photoStats.compressedBytes)}
          </small>
        )}

        {draft.photo && (
          <div className="photo-selected-actions">
            <button
              type="button"
              className="btn-remove-photo"
              onClick={() => {
                update('photo', '');
              }}
            >
              <IconTrash size={14} />
              <span>Bỏ ảnh đã chọn</span>
            </button>
            <CropControls draft={draft} onChange={updateCrop} />
          </div>
        )}
      </div>

      {/* 5. KHU VỰC THÔNG TIN BỔ SUNG (ACCORDION CÓ MŨI TÊN THU GỌN / MỞ RỘNG) */}
      <div className="accordion-wrapper">
        <button
          type="button"
          className="accordion-header-btn"
          onClick={() => setIsAccordionOpen(prev => !prev)}
          aria-expanded={isAccordionOpen}
        >
          <div className="accordion-title-left">
            <IconDocument size={17} color="#1b4332" />
            <span className="accordion-title">Thông tin bổ sung</span>
          </div>
          <span className="accordion-chevron">
            {isAccordionOpen ? (
              <IconChevronUp size={18} color="#333333" />
            ) : (
              <IconChevronDown size={18} color="#333333" />
            )}
          </span>
        </button>

        {isAccordionOpen && (
          <div className="accordion-content-grid">
            {/* Ô 1: Chữ ký tay của bạn */}
            <div className="accordion-cell">
              <div className="cell-label-row">
                <IconPen size={16} color="#1b4332" />
                <span className="cell-label">Chữ ký tay của bạn</span>
              </div>
              {draft.signatureData ? (
                <div className="signature-preview-box">
                  <img
                    src={draft.signatureData}
                    alt="Chữ ký đã vẽ"
                    className="signature-preview-thumbnail"
                  />
                  <div className="signature-btn-group">
                    <button
                      type="button"
                      className="btn-sig-action"
                      onClick={() => setIsPadOpen(true)}
                      title="Vẽ lại chữ ký"
                    >
                      <IconRefresh size={13} />
                      <span>Ký lại</span>
                    </button>
                    <button
                      type="button"
                      className="btn-sig-action danger"
                      onClick={handleClearSignature}
                      title="Xóa chữ ký"
                    >
                      <IconTrash size={13} />
                      <span>Xóa</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-draw-signature"
                  onClick={() => setIsPadOpen(true)}
                >
                  <IconPen size={15} color="#1b4332" />
                  <span>Bấm để vẽ chữ ký tay</span>
                </button>
              )}
            </div>

            {/* Ô 2: Địa điểm (Place of issue) */}
            <div className="accordion-cell">
              <div className="cell-label-row">
                <IconMapPin size={16} color="#1b4332" />
                <span className="cell-label">Địa điểm (Place of issue)</span>
              </div>
              <input
                className="cell-input"
                maxLength={120}
                value={draft.place}
                onChange={e => handleTextChange('place', e.target.value)}
                placeholder="Ví dụ: THE SIX, TORONTO"
              />
            </div>

            {/* Ô 3: Ngày kỷ niệm (Date of issue) */}
            <div className="accordion-cell">
              <div className="cell-label-row">
                <IconCalendar size={16} color="#1b4332" />
                <span className="cell-label">Ngày kỷ niệm (Date of issue)</span>
              </div>
              <input
                className="cell-input cell-date-input"
                type="date"
                value={draft.commemorativeDate}
                onChange={e => handleTextChange('commemorativeDate', e.target.value)}
              />
            </div>

            {/* Ô 4: Ngày sinh (Date of birth) */}
            <div className="accordion-cell">
              <div className="cell-label-row">
                <IconCalendar size={16} color="#1b4332" />
                <span className="cell-label">Ngày sinh (Date of birth)</span>
              </div>
              <input
                className="cell-input cell-date-input"
                type="date"
                value={draft.dateOfBirth}
                onChange={e => handleTextChange('dateOfBirth', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <SignaturePad
        isOpen={isPadOpen}
        onClose={() => setIsPadOpen(false)}
        initialSignature={draft.signatureData}
        onSave={handleSaveSignature}
      />
    </>
  );
}
