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
            Chỉ mất 2 phút để biến giai điệu kỷ niệm thành một chiếc thẻ NFC cầm trên tay.
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
              <span>Hỗ trợ mọi nền tảng nhạc phổ biến</span>
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
              Tải ảnh chân dung, điền ngày kỷ niệm, nơi phát hành và tự tay ký tên lên thẻ.
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
              Chạm nhẹ thẻ vào mặt lưng điện thoại có hỗ trợ NFC để mở ngay bản nhạc yêu thích.
            </p>
            <div className="card-footer-tip">
              <span className="tip-dot" />
              <span>Chạm phát tức thì, không cần cài app</span>
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
                  <span>Chip NFC NTAG cao cấp, không dùng pin hay sạc</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Kháng nước bề mặt, chống phai màu</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Tương thích iPhone (iOS) & hầu hết điện thoại Android</span>
                </li>
                <li>
                  <span className="check-icon">
                    <IconCheck size={14} />
                  </span>
                  <span>Bảo hành 1 đổi 1 nếu phát sinh lỗi kỹ thuật chip NFC</span>
                </li>
              </ul>
              <div className="support-box-footer">
                <span>Cần trợ giúp đặc biệt? Đội ngũ Harméa luôn sẵn sàng hỗ trợ.</span>
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
                  <strong>Không.</strong> Thẻ NFC hoạt động như một cầu nối thông minh không dây:
                  khi bạn chạm thẻ vào lưng điện thoại, máy sẽ tự động hiển thị thông báo để mở ngay
                  bài hát trên Spotify, Apple Music, YouTube hoặc SoundCloud thông qua kết nối
                  Internet của điện thoại.
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
                <p>Hầu hết mọi smartphone hiện đại đều hỗ trợ:</p>
                <ul>
                  <li>
                    <strong>iPhone:</strong> Từ iPhone 7 trở lên (đặc biệt từ iPhone Xr/Xs/11 trở đi
                    chỉ cần đưa thẻ gần cạnh trên máy là mở ngay, không cần thao tác gì thêm).
                  </li>
                  <li>
                    <strong>Android:</strong> Hầu hết dòng máy Samsung, Xiaomi, Oppo, Pixel... có
                    tích hợp NFC (bạn chỉ cần bật công tắc NFC trong Cài đặt nhanh).
                  </li>
                </ul>
              </div>
            </details>

            <details className="faq-accordion-card">
              <summary className="faq-summary">
                <span className="faq-question">Có thể thay đổi bài hát sau khi in không?</span>
                <span className="faq-toggle-icon">+</span>
              </summary>
              <div className="faq-answer">
                <p>
                  Ảnh, tên và chữ ký in vật lý trên thẻ sẽ được cố định vĩnh viễn với chất lượng màu
                  sắc cao cấp. Về đường link nhạc trên chip NFC, chúng mình sẽ khóa bảo vệ theo mặc
                  định để đảm bảo giai điệu kỷ niệm không bị người khác ghi đè nhầm.
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
                  Mọi đơn hàng tạo trên website đều được lưu lại và cấp mã theo dõi vận đơn (tra cứu
                  tại mục <em>Tra cứu đơn</em>). Cửa hàng sẽ tổng hợp danh sách thiết kế và thông
                  báo trực tiếp đến bạn trước khi tiến hành in ấn thực tế.
                </p>
              </div>
            </details>
          </div>
        </div>
      </section>
    </div>
  );
}
