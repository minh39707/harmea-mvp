import type { Shop } from '../../app/useShop';
import { money } from '../../shared/format';
import {
  IconVinyl,
  IconMusic,
  IconCard,
  IconSmartphoneNfc,
  IconPen,
  IconSparkle,
  IconChip,
  IconShield,
  IconStar
} from '../../shared/ui/Icons';

type HomeProps = Pick<Shop, 'go' | 'setDraft' | 'product'>;

export default function HomePage({ go, setDraft, product }: HomeProps) {
  const priceDisplay = product ? money(product.unitPriceVnd) : '50.000 ₫';

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
            Biến một bài hát ý nghĩa thành món quà hữu hình. Chỉ cần chạm nhẹ chiếc thẻ Harméa vào
            điện thoại, giai điệu yêu thương từ <strong>Spotify</strong>, <strong>YouTube</strong>{' '}
            hoặc <strong>SoundCloud</strong>
            sẽ lập tức cất lời.
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
                <strong>Chạm NFC 1 giây</strong>
                <span>Mở nhạc tức thì trên điện thoại</span>
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
                <strong>Không cần sạc pin</strong>
                <span>Chip NFC bền bỉ trọn đời</span>
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
              {/* Thẻ Kem kỷ niệm (The Weeknd - The Idol) */}
              <div
                className="hero-card-item card-cream"
                onClick={() => chooseColorAndCustomize('cream')}
                title="Bấm để thiết kế mẫu Kem kỷ niệm"
              >
                <img src="/images/card-sample-cream.jpg" alt="Mẫu thẻ Kem kỷ niệm" />
              </div>

              {/* Thẻ Xanh bình yên (Drake - Nothing Was The Same) */}
              <div
                className="hero-card-item card-blue"
                onClick={() => chooseColorAndCustomize('blue')}
                title="Bấm để thiết kế mẫu Xanh bình yên"
              >
                <img src="/images/card-sample-blue.jpg" alt="Mẫu thẻ Xanh bình yên" />
              </div>

              {/* Thẻ Hồng dịu dàng (Kendrick Lamar - DAMN.) */}
              <div
                className="hero-card-item card-rose"
                onClick={() => chooseColorAndCustomize('rose')}
                title="Bấm để thiết kế mẫu Hồng dịu dàng"
              >
                <img src="/images/card-sample-rose.jpg" alt="Mẫu thẻ Hồng dịu dàng" />
              </div>
            </div>

            {/* Floating badge */}
            <div className="hero-floating-badge">
              <span className="badge-music-icon">
                <IconMusic size={16} />
              </span>
              <div>
                <strong>Chạm là phát nhạc</strong>
                <small>Tương thích iOS & Android</small>
              </div>
            </div>
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
              Tải lên hình ảnh kỷ niệm, điền tên thẻ, ngày sinh, ngày kỷ niệm và chữ ký riêng. Trình
              chỉnh sửa cho phép xem trước mẫu in chuẩn xác.
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
              Khi nhận thẻ, chỉ cần đặt mặt sau điện thoại sát vào thẻ, đường dẫn bài hát sẽ tự động
              mở lên mà không cần cài đặt thêm ứng dụng bên thứ ba.
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
          <p className="section-subtitle">
            Ba gam màu trang nhã, hoàn thiện tỉ mỉ trên chất liệu cao cấp
          </p>
        </div>

        <div className="collection-grid">
          {/* Mẫu 1: Màu Kem */}
          <div className="color-card-item cream">
            <div className="color-card-preview cream-bg">
              <img
                src="/images/card-sample-cream.jpg"
                alt="Mẫu thẻ Kem kỷ niệm"
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
                src="/images/card-sample-blue.jpg"
                alt="Mẫu thẻ Xanh bình yên"
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
                src="/images/card-sample-rose.jpg"
                alt="Mẫu thẻ Hồng dịu dàng"
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
            <h4>Chất Liệu Thẻ Bền Bỉ</h4>
            <p>
              Kích thước chuẩn thẻ ATM (54 × 86mm), vừa vặn mọi ngăn ví hoặc mặt lưng ốp điện thoại.
            </p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconChip size={24} />
            </div>
            <h4>Chip NFC Độ Nhạy Cao</h4>
            <p>
              Phản hồi nhanh nhạy, không cần tải app chuyên dụng, hoạt động bền bỉ không cần pin
              sạc.
            </p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconSparkle size={24} />
            </div>
            <h4>Công Nghệ In Sắc Nét</h4>
            <p>Màu in trung thực, chống thấm nước nhẹ và hạn chế bay màu theo thời gian.</p>
          </div>
          <div className="feature-box">
            <div className="feature-icon">
              <IconShield size={24} />
            </div>
            <h4>An Toàn & Riêng Tư</h4>
            <p>Mọi liên kết và thông tin cá nhân hóa được xử lý chuẩn mực, an tâm khi chia sẻ.</p>
          </div>
        </div>
      </section>

      <div className="section-divider" aria-hidden="true" />

      {/* =========================================================================
          6. LỜI CHIA SẺ TỪ KHÁCH HÀNG (CUSTOMER EXPERIENCES)
         ========================================================================= */}
      <section className="home-reviews-section">
        <div className="section-header">
          <span className="section-eyebrow">CẢM XÚC GỬI GẮM</span>
          <h2 className="section-title">Khoảnh Khắc Cùng Harméa</h2>
          <p className="section-subtitle">
            Những chia sẻ và cảm xúc chân thật từ những người đã lưu giữ giai điệu cùng Harméa
          </p>
        </div>

        <div className="reviews-grid">
          <div className="review-card">
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} size={15} color="#d4a34b" />
              ))}
            </div>
            <p className="review-comment">
              “Mình đặt tặng người yêu bài hát kỷ niệm của hai đứa. Khi nhận thẻ, bạn ấy chạm nhẹ
              điện thoại vào lưng thẻ, giai điệu cất lên bất ngờ làm bạn ấy xúc động suýt khóc. Món
              quà vừa tinh tế vừa giàu cảm xúc!”
            </p>
            <div className="review-author">
              <strong>Khánh Vy</strong>
              <span>Hà Nội • Màu Kem kỷ niệm</span>
            </div>
          </div>

          <div className="review-card">
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} size={15} color="#d4a34b" />
              ))}
            </div>
            <p className="review-comment">
              “Chất lượng in rất chỉn chu, ảnh chân dung sắc nét và màu sắc trang nhã đúng như bản
              xem trước. Mình để thẻ sau ốp lưng trong suốt, bạn bè ai thấy cũng tò mò rồi thử chạm
              NFC nghe nhạc. Trải nghiệm rất mượt mà!”
            </p>
            <div className="review-author">
              <strong>Hoàng Minh</strong>
              <span>TP. Hồ Chí Minh • Màu Xanh bình yên</span>
            </div>
          </div>

          <div className="review-card">
            <div className="review-stars">
              {[...Array(5)].map((_, i) => (
                <IconStar key={i} size={15} color="#d4a34b" />
              ))}
            </div>
            <p className="review-comment">
              “Lựa chọn tuyệt vời để làm quà sinh nhật cho bạn thân. Thẻ có ảnh kỷ niệm, chữ ký tay
              riêng và liên kết đến playlist yêu thích trên Spotify, hoàn toàn độc bản không đụng
              hàng với bất kỳ món đồ nào khác.”
            </p>
            <div className="review-author">
              <strong>Thuỳ Trang</strong>
              <span>Đà Nẵng • Màu Hồng dịu dàng</span>
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
            src="/images/home-cta-showcase.jpg"
            alt="Bộ sưu tập 3 thẻ Harméa và đĩa than âm nhạc"
            className="cta-showcase-img"
          />
        </div>

        <div className="cta-inner">
          <span className="cta-tag">TRẢI NGHIỆM NGAY HÔM NAY</span>
          <h2 className="cta-heading">Sẵn Sàng Gửi Gắm Giai Điệu Của Riêng Bạn?</h2>
          <p className="cta-sub">
            Giá ưu đãi trải nghiệm demo: <strong>{priceDisplay}</strong> / thẻ. Không cần tài khoản
            phức tạp, tạo thẻ và nghe thử trong 2 phút.
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
