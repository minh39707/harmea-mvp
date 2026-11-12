import { Link } from '../shared/router';

export default function Footer() {
  return (
    <footer className="store-footer">
      <div className="footer-brand-wrap">
        <Link className="brand-btn" to="/" aria-label="Harméa — Trang chủ">
          <img src="/images/brand-emblem.png" alt="" className="brand-emblem-icon" />
          <span className="brand-text-logo">HARMÉA</span>
        </Link>
        <span className="footer-slogan">Music connects. Memories stay.</span>
      </div>
      <nav className="footer-nav" aria-label="Liên kết cửa hàng">
        <Link to="/design">Thiết kế thẻ</Link>
        <Link to="/how-nfc-works">NFC hoạt động thế nào?</Link>
        <Link to="/faq">Câu hỏi thường gặp</Link>
        <Link to="/policies/shipping">Giao hàng</Link>
        <Link to="/policies/returns">Đổi trả</Link>
        <Link to="/policies/privacy">Quyền riêng tư</Link>
        <Link to="/contact">Liên hệ</Link>
      </nav>
      <p className="footer-disclaimer">
        Chuyển khoản bằng QR. Cửa hàng kiểm tra giao dịch và xử lý giao hàng.
      </p>
      <p className="footer-disclaimer">© {new Date().getFullYear()} Harméa</p>
    </footer>
  );
}
