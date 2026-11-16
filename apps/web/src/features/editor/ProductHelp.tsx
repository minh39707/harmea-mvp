import { IconMusic, IconPen, IconSmartphoneNfc, IconChip, IconCheck } from '../../shared/ui/Icons';

export default function ProductHelp() {
  return (
    <div className="product-help-wrapper">
      {/* SECTION 1: CÁCH SỬ DỤNG */}
      <section id="how" className="how-section">
        <div className="section-header-center">
          <span className="section-pill">Quy trình đơn giản</span>
          <h2 className="section-heading">Cách sở hữu thẻ nhạc Harméa</h2>
          <p className="section-subtext">
            Thử quy trình tạo thiết kế thẻ NFC trong bản demo học phần.
          </p>
        </div>

        <div className="how-cards-grid">
          {/* Step 1 - Amber / Cream Theme */}
          <article className="how-card theme-cream">
            <div className="card-top-bar">
              <span className="step-badge">BƯỚC 01</span>
              <span className="step-icon-bubble">
                <IconMusic size={20} />
              </span>
            </div>
            <h3 className="card-step-title">Chọn một giai điệu</h3>
            <p className="card-step-desc">
              Dán liên kết bài hát hoặc playlist từ Spotify, YouTube hay SoundCloud bạn muốn lưu
              giữ.
            </p>
            <div className="card-footer-tip">
              <span className="tip-dot" />
              <span>Dùng liên kết hợp lệ từ dịch vụ âm nhạc phù hợp</span>
            </div>
          </article>

          {/* Step 2 - Soft Rose Theme */}
          <article className="how-card theme-rose">
            <div className="card-top-bar">
              <span className="step-badge">BƯỚC 02</span>
              <span className="step-icon-bubble">
                <IconPen size={20} />
              </span>
            </div>
            <h3 className="card-step-title">Biến nó thành của bạn</h3>
            <p className="card-step-desc">
              Dùng ảnh thử nghiệm không chứa dữ liệu riêng tư, điền thông tin mẫu và chữ ký demo.
            </p>
            <div className="card-footer-tip">
              <span className="tip-dot" />
              <span>Tùy chỉnh 3 màu thẻ & chữ ký tay riêng</span>
            </div>
          </article>

          {/* Step 3 - Sky Blue Theme */}
          <article className="how-card theme-blue">
            <div className="card-top-bar">
              <span className="step-badge">BƯỚC 03</span>
              <span className="step-icon-bubble">
                <IconSmartphoneNfc size={20} />
              </span>
            </div>
            <h3 className="card-step-title">Chạm để mở giai điệu</h3>
            <p className="card-step-desc">
              Điện thoại tương thích có thể hiển thị liên kết để người dùng xác nhận mở.
            </p>
            <div className="card-footer-tip">
              <span className="tip-dot" />
              <span>Cách mở liên kết phụ thuộc thiết bị và dịch vụ âm nhạc</span>
            </div>
          </article>
        </div>
      </section>

      {/* SECTION 2: CÂU HỎI THƯỜNG GẶP (FAQ) */}
      <section className="faq-section">
        <div className="faq-layout">
          {/* Left Column: Heading + Trust/Support Box to eliminate empty space */}
          <div className="faq-intro-col">
            <span className="section-pill">Hỗ trợ & Thắc mắc</span>
            <h2 className="faq-main-title">Câu hỏi thường gặp</h2>
            <p className="faq-main-desc">
              Giải đáp những câu hỏi phổ biến nhất về cách hoạt động và tính tương thích của thẻ
              Harméa.
            </p>

            <div className="faq-support-box">
              <div className="support-box-header">
                <span className="support-icon">
                  <IconChip size={20} />
                </span>
                <h4>Đặc điểm công nghệ thẻ</h4>
              </div>
              <ul className="support-perks">
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Ý tưởng dùng chip NFC thụ động, không cần pin</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Chất liệu, độ bền và chất lượng in chưa được kiểm chứng</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Khả năng đọc phụ thuộc điện thoại, hệ điều hành và cài đặt NFC</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Bản demo chưa có chính sách bảo hành hoặc đổi sản phẩm</span>
                </li>
              </ul>
              <div className="support-box-footer">
                <span>Bản demo chưa vận hành kênh chăm sóc khách hàng.</span>
              </div>
            </div>
          </div>

          {/* Right Column: Accordion Questions */}
          <div className="faq-accordion-col">
            <details className="faq-accordion-card" open>
              <summary className="faq-summary">
                <span className="faq-question">Thẻ có tự phát nhạc ra loa ngoài không?</span>
                <span className="faq-toggle-icon">+</span>
              </summary>
              <div className="faq-answer">
                <p>
                  <strong>Không thể đảm bảo tự phát.</strong> Điện thoại có NFC tương thích có thể
                  hiển thị liên kết; người dùng cần xác nhận mở và dịch vụ âm nhạc có thể yêu cầu
                  ứng dụng, đăng nhập hoặc kết nối Internet.
                </p>
              </div>
            </details>

            <details className="faq-accordion-card">
              <summary className="faq-summary">
                <span className="faq-question">
                  Những dòng điện thoại nào quét được thẻ Harméa?
                </span>
                <span className="faq-toggle-icon">+</span>
              </summary>
              <div className="faq-answer">
                <p>
                  Điện thoại phải có NFC và được bật chức năng này. Vị trí đọc, thông báo mở liên
                  kết và ứng dụng sử dụng khác nhau theo thiết bị; nhóm chưa kiểm chứng đầy đủ danh
                  sách model tương thích.
                </p>
              </div>
            </details>

            <details className="faq-accordion-card">
              <summary className="faq-summary">
                <span className="faq-question">Có thể thay đổi bài hát sau khi in không?</span>
                <span className="faq-toggle-icon">+</span>
              </summary>
              <div className="faq-answer">
                <p>
                  Bản demo chỉ mô phỏng thiết kế và chưa ghi chip thật. Khả năng thay đổi hoặc khóa
                  liên kết phụ thuộc loại chip và quy trình ghi thẻ, cần được kiểm chứng trước khi
                  sản xuất.
                </p>
              </div>
            </details>

            <details className="faq-accordion-card">
              <summary className="faq-summary">
                <span className="faq-question">Đơn đặt hàng demo/thử nghiệm xử lý thế nào?</span>
                <span className="faq-toggle-icon">+</span>
              </summary>
              <div className="faq-answer">
                <p>
                  Đơn demo được lưu để kiểm tra luồng và cấp mã tra cứu. Không có sản xuất, giao
                  hàng hoặc liên hệ khách hàng. Chỉ sử dụng tên, số điện thoại, địa chỉ và ảnh giả
                  khi thử nghiệm.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
