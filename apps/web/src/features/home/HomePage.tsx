import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';
import type { BackgroundMusic } from '../music/useBackgroundMusic';
import {
  IconVinyl,
  IconMusic,
  IconCard,
  IconSmartphoneNfc,
  IconPen,
  IconSparkle,
  IconChip,
  IconShield
} from '../../shared/ui/Icons';

type HomeProps = Pick<Shop, 'go' | 'setDraft' | 'product'> & { music: BackgroundMusic };

export default function HomePage({ go, setDraft, product, music }: HomeProps) {
  const priceDisplay = product ? money(product.unitPriceVnd) : '89.000 ₫';

  function chooseColorAndCustomize(color: 'cream' | 'blue' | 'rose') {
    setDraft(prev => ({ ...prev, color }));
    go('product');
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  return (
    <div className="home-container">
      {/* =========================================================================
          1. HERO SECTION - BANNER CHÍNH (Bạn có thể thay đổi text, slogan tại đây)
         ========================================================================= */}
      <section className="home-hero">
        <div className="hero-content">
          <div className="hero-pill">
            <span className="pill-dot"></span>
            <span>THẺ ÂM NHẠC NFC CÁ NHÂN HÓA</span>
          </div>

          <h1 className="hero-title">
            Lưu Giữ Giai Điệu.
            <br />
            <span className="hero-highlight">Đóng Băng Kỷ Niệm.</span>
          </h1>

          <p className="hero-desc">
            Biến một bài hát ý nghĩa thành món quà hữu hình. Theo ý tưởng sản phẩm, điện thoại có
            NFC tương thích có thể hiển thị liên kết từ thẻ để người dùng xác nhận mở bằng{' '}
            <strong>Spotify</strong>, <strong>YouTube</strong> hoặc <strong>SoundCloud</strong>.
          </p>

          <div className="hero-actions">
            <button className="btn-hero-primary" onClick={() => go('product')}>
              <span>Bắt Đầu Thiết Kế Thẻ</span>
              <span className="btn-arrow">→</span>
            </button>
            <button className="btn-hero-secondary" onClick={() => scrollToSection('how-it-works')}>
              Cách thức hoạt động
            </button>
          </div>

          <div className="hero-trust-bar">
            <div className="trust-card">
              <div className="trust-icon-box">
                <IconSmartphoneNfc size={18} />
              </div>
              <div className="trust-text">
                <strong>Chạm thẻ NFC</strong>
                <span>Hiển thị liên kết trên điện thoại tương thích</span>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <IconSparkle size={18} />
              </div>
              <div className="trust-text">
                <strong>In ảnh & Lời tựa riêng</strong>
                <span>Tùy biến chữ ký & ngày kỷ niệm</span>
              </div>
            </div>

            <div className="trust-card">
              <div className="trust-icon-box">
                <IconShield size={18} />
              </div>
              <div className="trust-text">
                <strong>NFC không dùng pin</strong>
                <span>Loại chip và độ tương thích cần được kiểm tra thực tế</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cột hình ảnh minh họa Hero */}
        <div className="hero-visual">
          <div className="visual-card-wrapper">
            <div className="vinyl-glow-backdrop"></div>

            {/* Đĩa than phát sáng - Biểu tượng thương hiệu */}
            <div className="spinning-vinyl-disc" title="Harméa Emblem Vinyl">
              <img
                src="/images/brand-emblem.png"
                alt="Harméa Music Disc Emblem"
                className="disc-img"
              />
            </div>

            {/* 3 Thẻ mẫu xếp lớp sống động theo bố cục mới (Kem, Xanh, Hồng) */}
            <div className="hero-cards-composition">
              {/* Mẫu trống để người dùng thêm ảnh có quyền sử dụng */}
              <div
                className="hero-card-item card-cream"
                onClick={() => chooseColorAndCustomize('cream')}
                title="Bấm để thiết kế mẫu Kem kỷ niệm"
              >
                <img src="/images/template-blank-cream.jpg" alt="Mẫu thẻ trống màu Kem kỷ niệm" />
              </div>

              {/* Mẫu trống để người dùng thêm ảnh có quyền sử dụng */}
              <div
                className="hero-card-item card-blue"
                onClick={() => chooseColorAndCustomize('blue')}
                title="Bấm để thiết kế mẫu Xanh bình yên"
              >
                <img src="/images/template-blank-blue.jpg" alt="Mẫu thẻ trống màu Xanh bình yên" />
              </div>

              {/* Mẫu trống để người dùng thêm ảnh có quyền sử dụng */}
              <div
                className="hero-card-item card-rose"
                onClick={() => chooseColorAndCustomize('rose')}
                title="Bấm để thiết kế mẫu Hồng dịu dàng"
              >
                <img src="/images/template-blank-rose.jpg" alt="Mẫu thẻ trống màu Hồng dịu dàng" />
              </div>
            </div>

            {/* Floating badge */}
            <button
              type="button"
              className="hero-floating-badge"
              onClick={() => void music.toggle()}
              aria-pressed={music.playing || music.loading}
              aria-label={music.playing ? 'Tắt nhạc nền của website' : 'Bật nhạc nền của website'}
            >
              <span className="badge-music-icon">
                <IconMusic size={16} />
              </span>
              <span>
                <strong>
                  {music.loading
                    ? 'Đang tải nhạc…'
                    : music.playing
                      ? 'Đang phát • Bấm để tắt'
                      : 'Bật nhạc nền'}
                </strong>
                <small>Âm thanh minh họa trên website</small>
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. GIỚI THIỆU Ý NGHĨA - BRAND STORY & MANIFESTO
         ========================================================================= */}
      <section className="home-story-section">
        <div className="story-container">
          <span className="section-eyebrow">CÂU CHUYỆN HARMÉA</span>
          <h2 className="story-quote">
            “Âm nhạc không chỉ để lắng nghe, mà là nơi cất giữ những khoảnh khắc đẹp nhất của cuộc
            đời.”
          </h2>
          <p className="story-text">
            Trong thế giới số hoá nhanh chóng, những bản nhạc chúng ta cùng nghe có thể trôi theo
            danh sách phát.
            <strong> Harméa</strong> ra đời để biến những rung động vô hình thành một kỷ vật hữu
            hình mà bạn có thể cầm trên tay, ngắm nhìn và chia sẻ cho người đặc biệt bất cứ khi nào.
          </p>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* =========================================================================
          3. CÁCH HOẠT ĐỘNG (HOW IT WORKS - 3 BƯỚC ĐƠN GIẢN)
         ========================================================================= */}
      <section id="how-it-works" className="home-steps-section">
        <div className="section-header">
          <span className="section-eyebrow">TRẢI NGHIỆM ĐƠN GIẢN</span>
          <h2 className="section-title">Cách Thức Hoạt Động</h2>
          <p className="section-subtitle">
            Chỉ 3 bước đơn giản để tạo nên chiếc thẻ âm nhạc độc nhất vô nhị
          </p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-card-header">
              <div className="step-number">01</div>
              <div className="step-icon-wrap">
                <IconVinyl size={24} />
              </div>
            </div>
            <h3 className="step-heading">Chọn Giai Điệu Ý Nghĩa</h3>
            <p className="step-desc">
              Dán liên kết bài hát từ <strong>Spotify</strong>, <strong>YouTube</strong> hoặc{' '}
              <strong>SoundCloud</strong> mang nhiều kỷ niệm nhất với hai bạn.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card-header">
              <div className="step-number">02</div>
              <div className="step-icon-wrap">
                <IconPen size={24} />
              </div>
            </div>
            <h3 className="step-heading">Tùy Biến Bức Ảnh & Lời Nhắn</h3>
            <p className="step-desc">
              Tải lên hình ảnh thử nghiệm, điền thông tin mẫu và xem trước thiết kế demo. Bản xem
              trước chưa phải file in đã được kiểm chứng.
            </p>
          </div>

          <div className="step-card">
            <div className="step-card-header">
              <div className="step-number">03</div>
              <div className="step-icon-wrap">
                <IconSmartphoneNfc size={24} />
              </div>
            </div>
            <h3 className="step-heading">Chạm Nhẹ Để Lắng Nghe</h3>
            <p className="step-desc">
              Theo ý tưởng sản phẩm, điện thoại có NFC tương thích có thể hiển thị liên kết. Người
              dùng vẫn cần xác nhận mở, và dịch vụ âm nhạc có thể yêu cầu ứng dụng hoặc đăng nhập.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* =========================================================================
          4. BỘ SƯU TẬP MÀU THẺ (CARD COLORWAYS SHOWCASE)
         ========================================================================= */}
      <section className="home-collection-section">
        <div className="section-header">
          <span className="section-eyebrow">BỘ SƯU TẬP HARMÉA</span>
          <h2 className="section-title">Chọn Phong Cách Của Bạn</h2>
          <p className="section-subtitle">Ba gam màu dùng trong bản thiết kế demo</p>
        </div>

        <div className="collection-grid">
          {/* Mẫu 1: Màu Kem */}
          <div className="color-card-item cream">
            <div className="color-card-preview cream-bg">
              <img
                src="/images/template-blank-cream.jpg"
                alt="Mẫu thẻ trống màu Kem kỷ niệm"
                className="home-color-sample-img"
              />
              <div className="mini-card-tag">CREAM CLASSIC</div>
            </div>
            <div className="color-card-info">
              <h3>Kem Kỷ Niệm (Cream)</h3>
              <p>Thanh lịch, hoài niệm, tạo cảm giác ấm áp và gần gũi như một trang nhật ký cũ.</p>
              <button className="btn-choose-color" onClick={() => chooseColorAndCustomize('cream')}>
                Thiết Kế Mẫu Này →
              </button>
            </div>
          </div>

          {/* Mẫu 2: Màu Xanh Lam */}
          <div className="color-card-item blue">
            <div className="color-card-preview blue-bg">
              <img
                src="/images/template-blank-blue.jpg"
                alt="Mẫu thẻ trống màu Xanh bình yên"
                className="home-color-sample-img"
              />
              <div className="mini-card-tag">MIDNIGHT BLUE</div>
            </div>
            <div className="color-card-info">
              <h3>Xanh Bình Yên (Blue)</h3>
              <p>Trầm tĩnh, sâu sắc và huyền bí tựa bầu trời đêm đầy ánh sao và giai điệu.</p>
              <button className="btn-choose-color" onClick={() => chooseColorAndCustomize('blue')}>
                Thiết Kế Mẫu Này →
              </button>
            </div>
          </div>

          {/* Mẫu 3: Màu Hồng */}
          <div className="color-card-item rose">
            <div className="color-card-preview rose-bg">
              <img
                src="/images/template-blank-rose.jpg"
                alt="Mẫu thẻ trống màu Hồng dịu dàng"
                className="home-color-sample-img"
              />
              <div className="mini-card-tag">ROSE SUNSET</div>
            </div>
            <div className="color-card-info">
              <h3>Hồng Dịu Dàng (Rose)</h3>
              <p>
                Ngọt ngào, dịu dàng, lựa chọn hoàn hảo cho món quà tình yêu hay tình bạn thân thiết.
              </p>
              <button className="btn-choose-color" onClick={() => chooseColorAndCustomize('rose')}>
                Thiết Kế Mẫu Này →
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* =========================================================================
          5. ĐẶC ĐIỂM NỔI BẬT (FEATURES GRID)
         ========================================================================= */}
      <section className="home-features-section">
        <div className="features-grid">
          <div className="feature-box">
            <div className="feature-icon">
              <IconCard size={24} />
            </div>
            <h4>Kích Thước Thiết Kế</h4>
            <p>
              Bản thiết kế dùng kích thước 54 × 86mm. Chất liệu và độ bền chưa được kiểm chứng bằng
              mẫu sản xuất.
            </p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconChip size={24} />
            </div>
            <h4>Ý Tưởng Liên Kết NFC</h4>
            <p>Chip NFC thụ động không dùng pin; loại chip và khả năng đọc cần được thử thực tế.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconSparkle size={24} />
            </div>
            <h4>Bản Xem Trước Thiết Kế</h4>
            <p>
              Màu sắc trên màn hình chỉ để mô phỏng; chất lượng in và độ bền chưa được xác nhận.
            </p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconShield size={24} />
            </div>
            <h4>Dữ Liệu Thử Nghiệm</h4>
            <p>
              Chỉ dùng dữ liệu và ảnh giả trong bản demo; xem trang Quyền riêng tư trước khi thử.
            </p>
          </div>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* Kết quả kiểm thử học phần, không phải đánh giá khách hàng */}
      <section className="home-reviews-section">
        <div className="section-header">
          <span className="section-eyebrow">KIỂM THỬ HỌC PHẦN</span>
          <h2 className="section-title">Kết Quả Thử Nghiệm Ban Đầu</h2>
          <p className="section-subtitle">
            Số liệu từ 10 người thử luồng đặt đơn demo ngày 10–11/11/2026; không phải đánh giá của
            khách hàng và không có giao dịch thật.
          </p>
        </div>

        <div className="reviews-grid">
          <div className="review-card">
            <p className="review-comment">
              9/10 người thử hoàn thành luồng đặt đơn demo. Một người dừng ở màn hình QR vì lo ngại
              đây là yêu cầu chuyển tiền thật.
            </p>
            <div className="review-author">
              <strong>Completion</strong>
              <span>Store Test T1–T10 • Results R2–R3</span>
            </div>
          </div>

          <div className="review-card">
            <p className="review-comment">
              Thời gian hoàn thành trung bình là 6,65 phút và điểm dễ sử dụng trung bình là 3,7/5.
            </p>
            <div className="review-author">
              <strong>Usability</strong>
              <span>Results R4–R5</span>
            </div>
          </div>

          <div className="review-card">
            <p className="review-comment">
              Các vấn đề chính gồm ngày và phí giao hàng chưa rõ, thiếu lời nhắn, vùng ký làm cuộn
              trang, nhãn khó hiểu và bàn phím che nút thao tác.
            </p>
            <div className="review-author">
              <strong>Observed issues</strong>
              <span>Store Test T1–T10 • Fixes F1–F8</span>
            </div>
          </div>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* =========================================================================
          7. CALL TO ACTION CUỐI TRANG (BANNER ĐẶT HÀNG VỚI BỘ SƯU TẬP 3 MẪU THẺ)
         ========================================================================= */}
      <section className="home-cta-banner">
        <div className="cta-showcase-box">
          <img
            src="/images/card-real-3.jpg"
            alt="Minh họa thẻ NFC Harméa với hình phong cảnh không nhận diện cá nhân"
            className="cta-showcase-img"
          />
        </div>

        <div className="cta-inner">
          <span className="cta-tag">TRẢI NGHIỆM NGAY HÔM NAY</span>
          <h2 className="cta-heading">Sẵn Sàng Gửi Gắm Giai Điệu Của Riêng Bạn?</h2>
          <p className="cta-sub">
            Giá mô phỏng: <strong>{priceDisplay}</strong> / thẻ. Không cần tài khoản; bạn có thể tạo
            preview và thử luồng đặt đơn demo ngay trên website.
          </p>
          <div className="cta-actions">
            <button className="btn-cta-large" onClick={() => go('product')}>
              Bắt Đầu Tạo Thẻ Ngay →
            </button>
            <button className="btn-cta-track" onClick={() => go('tracking')}>
              Tra Cứu Đơn Hàng Đã Tạo
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
