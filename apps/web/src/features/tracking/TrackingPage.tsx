import type { Shop } from '../../app/useShop';
import { statusLabels } from '../../shared/order-status';
import type { OrderStatus } from '../../shared/types';
import {
  IconSearch,
  IconDocument,
  IconSmartphoneNfc,
  IconShield,
  IconSparkle,
  IconCheck,
  IconClock,
  IconTruck,
  IconPackage,
  IconRefresh
} from '../../shared/ui/Icons';

const date = (value: string) =>
  new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

const STEPS: Array<{ key: OrderStatus; label: string; icon: typeof IconCheck }> = [
  { key: 'pending', label: 'Chờ xác nhận', icon: IconClock },
  { key: 'confirmed', label: 'Đã xác nhận', icon: IconCheck },
  { key: 'producing', label: 'Đang sản xuất', icon: IconSparkle },
  { key: 'shipping', label: 'Đang giao', icon: IconTruck },
  { key: 'completed', label: 'Hoàn thành', icon: IconPackage }
];

function getStepIndex(status: OrderStatus): number {
  if (status === 'cancelled') return -1;
  const idx = STEPS.findIndex(s => s.key === status);
  return idx >= 0 ? idx : 0;
}

export default function TrackingPage({
  lookup,
  trackOrderNumber,
  setTrackOrderNumber,
  trackPhone,
  setTrackPhone,
  trackingBusy,
  tracking
}: Pick<
  Shop,
  | 'lookup'
  | 'trackOrderNumber'
  | 'setTrackOrderNumber'
  | 'trackPhone'
  | 'setTrackPhone'
  | 'trackingBusy'
  | 'tracking'
>) {
  const currentStep = tracking ? getStepIndex(tracking.status) : 0;

  return (
    <div className="tracking-page-container">
      {/* 1. HEADER SECTION VỚI PILL VÀ TIÊU ĐỀ SANG TRỌNG */}
      <div className="tracking-hero-header">
        <div className="tracking-pill">
          <span className="tracking-pill-dot"></span>
          <span>HỆ THỐNG TRA CỨU TIẾN ĐỘ</span>
        </div>
        <h1 className="tracking-main-title">Tra Cứu Đơn Hàng Của Bạn</h1>
        <p className="tracking-subtitle">
          Nhập mã đơn hàng và số điện thoại đã đăng ký để kiểm tra tiến độ in ấn, đóng gói và vận
          chuyển thẻ Harméa.
        </p>
      </div>

      {/* 2. FORM TRA CỨU CARD */}
      <div className="tracking-card">
        <div className="tracking-card-header">
          <IconSearch size={18} color="var(--brand)" />
          <span className="tracking-card-title">Thông tin tra cứu</span>
        </div>

        <form
          className="tracking-form"
          onSubmit={e => {
            e.preventDefault();
            void lookup(trackOrderNumber, trackPhone);
          }}
        >
          <div className="tracking-inputs-grid">
            <div className="tracking-field">
              <label htmlFor="track-order-num" className="field-label-row">
                <IconDocument size={16} color="var(--brand)" />
                <span>Mã đơn hàng *</span>
              </label>
              <input
                id="track-order-num"
                required
                disabled={trackingBusy}
                value={trackOrderNumber}
                onChange={e => setTrackOrderNumber(e.target.value)}
                placeholder="HM-0123456789ABCDEF"
                autoComplete="off"
                spellCheck={false}
                className="tracking-input order-code-input"
              />
            </div>

            <div className="tracking-field">
              <label htmlFor="track-phone-num" className="field-label-row">
                <IconSmartphoneNfc size={16} color="var(--brand)" />
                <span>Số điện thoại đặt hàng *</span>
              </label>
              <input
                id="track-phone-num"
                required
                type="tel"
                maxLength={32}
                disabled={trackingBusy}
                value={trackPhone}
                onChange={e => setTrackPhone(e.target.value)}
                placeholder="0912 345 678"
                autoComplete="tel"
                className="tracking-input"
              />
            </div>
          </div>

          <div className="tracking-actions-row">
            <button
              type="submit"
              className="btn-tracking-submit"
              disabled={trackingBusy}
              aria-busy={trackingBusy}
            >
              <IconSearch size={18} color="#ffffff" />
              <span>{trackingBusy ? 'Đang kiểm tra dữ liệu…' : 'Tra cứu đơn hàng →'}</span>
            </button>
          </div>
        </form>

        <div className="tracking-guarantees">
          <div className="guarantee-item">
            <IconShield size={15} color="var(--brand)" />
            <span>Bảo mật dữ liệu 100%</span>
          </div>
          <span className="guarantee-divider">•</span>
          <div className="guarantee-item">
            <IconSparkle size={15} color="var(--brand)" />
            <span>Cập nhật tiến độ tức thì</span>
          </div>
        </div>
      </div>

      {/* 3. KẾT QUẢ TRA CỨU TIẾN ĐỘ */}
      {tracking && (
        <div className="tracking-result-card" aria-live="polite">
          {/* Header kết quả */}
          <div className="result-header-row">
            <div className="result-order-meta">
              <span className="order-number-tag">MÃ ĐƠN HÀNG</span>
              <h2 className="result-order-title">{tracking.orderNumber}</h2>
              <span className="result-time-hint">Tạo lúc {date(tracking.createdAt)}</span>
            </div>

            <div className={`status-pill status-${tracking.status}`}>
              <span className="status-dot"></span>
              <span>{statusLabels[tracking.status]}</span>
            </div>
          </div>

          {/* Stepper tiến độ 5 bước (nếu đơn không bị huỷ) */}
          {tracking.status !== 'cancelled' ? (
            <div className="tracking-stepper-box">
              <div className="stepper-track-bar">
                <div
                  className="stepper-fill-bar"
                  style={{
                    width: `${(Math.max(0, currentStep) / (STEPS.length - 1)) * 100}%`
                  }}
                />
              </div>

              <div className="stepper-steps-row">
                {STEPS.map((step, idx) => {
                  const isDone = currentStep >= idx;
                  const isCurrent = currentStep === idx;
                  const IconComponent = step.icon;
                  return (
                    <div
                      key={step.key}
                      className={`stepper-node ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                    >
                      <div className="node-icon-circle">
                        {isDone && !isCurrent ? (
                          <IconCheck size={14} strokeWidth={2.5} />
                        ) : (
                          <IconComponent size={14} />
                        )}
                      </div>
                      <span className="node-label">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="cancelled-alert-box">
              <strong>Đơn hàng đã được ghi nhận hủy</strong>
              <p>Mọi thắc mắc vui lòng liên hệ trực tiếp cửa hàng để được hỗ trợ.</p>
            </div>
          )}

          {/* Lưới thông tin chi tiết */}
          <div className="result-info-grid">
            <div className="info-cell">
              <span className="cell-caption">CẬP NHẬT MỚI NHẤT</span>
              <strong className="cell-value">{date(tracking.updatedAt)}</strong>
            </div>

            <div className="info-cell">
              <span className="cell-caption">MÃ VẬN ĐƠN BƯU CHÍNH</span>
              <strong className="cell-value highlight">
                {tracking.trackingCode ? tracking.trackingCode : 'Đang chuẩn bị đóng gói'}
              </strong>
            </div>

            <div className="info-cell">
              <span className="cell-caption">QUY CÁCH ĐÓNG GÓI</span>
              <strong className="cell-value">Hộp quà Harméa + Khăn lau cao cấp</strong>
            </div>
          </div>

          {/* Lịch sử cập nhật tiến độ */}
          <div className="history-section">
            <div className="history-section-title">
              <IconClock size={16} color="var(--brand)" />
              <span>Nhật ký hành trình đơn hàng</span>
            </div>

            <ol className="timeline-list">
              {tracking.history.map((event, i) => (
                <li key={i} className="timeline-item">
                  <div className="timeline-bullet" />
                  <div className="timeline-content">
                    <strong className="timeline-status-name">{statusLabels[event.status]}</strong>
                    <time className="timeline-timestamp" dateTime={event.occurredAt}>
                      {date(event.occurredAt)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Chân thẻ kết quả */}
          <div className="result-footer">
            <button
              type="button"
              className="btn-refresh-status"
              disabled={trackingBusy}
              onClick={() => void lookup(trackOrderNumber, trackPhone)}
            >
              <IconRefresh size={15} />
              <span>{trackingBusy ? 'Đang làm mới…' : 'Làm mới tiến độ'}</span>
            </button>
            <p className="privacy-note">
              Chỉ hiển thị tiến độ do cửa hàng ghi nhận; thông tin người nhận, ảnh và thiết kế được
              giữ riêng tư an toàn.
            </p>
          </div>
        </div>
      )}

      <div className="section-divider" aria-hidden="true" />

      {/* 4. HƯỚNG DẪN & HỖ TRỢ */}
      <div className="tracking-help-card">
        <h3 className="help-card-title">Bạn không tìm thấy mã đơn hàng?</h3>
        <ul className="help-points-list">
          <li>
            Mã đơn hàng có tiền tố <strong>HM-</strong> (ví dụ: HM-A1B2C3D4) được hiển thị trên màn
            hình sau khi bạn nhấn đặt thử thành công.
          </li>
          <li>
            Số điện thoại tra cứu phải trùng khớp với số điện thoại đã nhập khi tạo đơn hàng để bảo
            mật thông tin.
          </li>
          <li>
            Nếu lỡ đóng trình duyệt và quên mã đơn, bạn có thể liên hệ bộ phận hỗ trợ khách hàng qua
            số điện thoại đặt đơn để được cấp lại.
          </li>
        </ul>
      </div>
    </div>
  );
}
