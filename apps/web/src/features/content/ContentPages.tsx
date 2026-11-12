import { Link } from '../../shared/router';
import type { RouteName } from '../../shared/router';

type ContentPageName = Extract<
  RouteName,
  | 'about'
  | 'how-nfc-works'
  | 'faq'
  | 'shipping-policy'
  | 'returns-policy'
  | 'privacy-policy'
  | 'contact'
>;

const pages: Record<ContentPageName, { title: string; eyebrow: string }> = {
  about: { title: 'Về Harméa', eyebrow: 'Câu chuyện' },
  'how-nfc-works': { title: 'NFC hoạt động thế nào?', eyebrow: 'Tìm hiểu' },
  faq: { title: 'Câu hỏi thường gặp', eyebrow: 'Hỗ trợ' },
  'shipping-policy': { title: 'Chính sách giao hàng', eyebrow: 'Chính sách' },
  'returns-policy': { title: 'Chính sách đổi trả', eyebrow: 'Chính sách' },
  'privacy-policy': { title: 'Quyền riêng tư', eyebrow: 'Chính sách' },
  contact: { title: 'Liên hệ', eyebrow: 'Hỗ trợ' }
};

function AboutPage() {
  return (
    <>
      <p>
        Harméa là ý tưởng về một tấm thẻ NFC cá nhân hóa để lưu giữ hình ảnh, lời nhắn và liên kết
        âm nhạc. Website hiện là bản demo; quy mô kinh doanh, pháp nhân và thời điểm mở bán:{' '}
        <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
      <p>
        Bạn có thể thử trình thiết kế và lưu các mẫu trong giỏ trên trình duyệt hiện tại. Bản demo
        chưa thu tiền và chưa tự động giao hàng.
      </p>
      <p className="content-actions">
        <Link className="button primary" to="/design">
          Thử thiết kế thẻ
        </Link>
      </p>
    </>
  );
}

function NfcPage() {
  return (
    <>
      <p>
        NFC là công nghệ giao tiếp tầm gần. Theo ý tưởng sản phẩm, chip trên thẻ sẽ chứa một liên
        kết. Điện thoại có NFC tương thích có thể hiển thị thông báo để người dùng mở liên kết đó.
      </p>
      <p>
        Điện thoại không tự phát nhạc chỉ bằng thao tác chạm. Người dùng có thể cần xác nhận mở liên
        kết, cài ứng dụng hoặc đăng nhập vào dịch vụ âm nhạc. Cách ghi liên kết lên thẻ, loại chip
        và danh sách thiết bị đã kiểm tra: <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
      <p className="content-note">
        Khả năng đọc NFC và cách mở liên kết còn tùy thiết bị, hệ điều hành và cài đặt của người
        dùng.
      </p>
    </>
  );
}

function FaqPage() {
  return (
    <div className="content-faq">
      <details>
        <summary>Tôi có cần tạo tài khoản không?</summary>
        <p>Không. Bản demo không có tài khoản khách hàng.</p>
      </details>
      <details>
        <summary>Chạm thẻ có tự phát nhạc không?</summary>
        <p>
          Không thể đảm bảo tự phát. Điện thoại tương thích có thể hiển thị liên kết; người dùng
          thường cần xác nhận mở và dịch vụ âm nhạc có thể yêu cầu ứng dụng hoặc đăng nhập.
        </p>
      </details>
      <details>
        <summary>Tôi thanh toán như thế nào?</summary>
        <p>
          Sau khi đặt đơn, quét mã QR và nhập đúng số tiền, mã đơn. Bấm “Tôi đã chuyển khoản” để báo
          cửa hàng kiểm tra giao dịch. Giao hàng được cửa hàng xử lý riêng.
        </p>
      </details>
      <details>
        <summary>Tôi tra cứu đơn như thế nào?</summary>
        <p>
          Nhập mã đơn và số điện thoại đã cung cấp khi đặt hàng tại trang{' '}
          <Link to="/track">tra cứu đơn</Link>.
        </p>
      </details>
      <details>
        <summary>Thời gian giao hàng và quy định đổi trả ra sao?</summary>
        <p>
          Các nội dung này chưa được xác nhận. Xem{' '}
          <Link to="/policies/shipping">chính sách giao hàng</Link> và{' '}
          <Link to="/policies/returns">chính sách đổi trả</Link> trước khi sử dụng.
        </p>
      </details>
      <details>
        <summary>Tôi liên hệ với Harméa ở đâu?</summary>
        <p>
          Thông tin liên hệ chính thức đang chờ xác nhận tại trang{' '}
          <Link to="/contact">liên hệ</Link>.
        </p>
      </details>
    </div>
  );
}

function ShippingPage() {
  return (
    <>
      <p>
        Đây là bản demo, chưa thu tiền và chưa tự động giao hàng. Phạm vi khu vực giao, đơn vị vận
        chuyển, phí giao hàng và thời gian dự kiến: <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
      <p>
        Vui lòng xác nhận các thông tin này trước khi mở bán hoặc nhận đơn thật. Xem thêm{' '}
        <Link to="/policies/returns">chính sách đổi trả</Link>.
      </p>
    </>
  );
}

function ReturnsPage() {
  return (
    <>
      <p>
        Điều kiện đổi hoặc trả, thời hạn yêu cầu, cách gửi sản phẩm về và phương án xử lý chi phí:{' '}
        <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
      <p>
        Chính sách đổi trả đang chờ cửa hàng xác nhận. Vui lòng không coi phần này là chính sách đã
        có hiệu lực.
      </p>
    </>
  );
}

function PrivacyPage() {
  return (
    <>
      <h2>Dữ liệu trong trình duyệt</h2>
      <p>
        Không có tài khoản khách hàng. Trước khi đặt đơn, thông tin giỏ hàng và thiết kế được lưu
        trong trình duyệt của khách; ảnh được lưu trong bộ nhớ của trình duyệt này. Xóa dữ liệu
        trang hoặc dùng thiết bị/trình duyệt khác có thể làm mất giỏ và ảnh.
      </p>
      <h2>Dữ liệu gửi khi đặt hàng</h2>
      <p>
        Khi gửi đơn, thông tin người nhận được gửi để xử lý đơn; ảnh đơn hàng được lưu trên máy chủ
        để phục vụ sản xuất. Metadata ảnh như EXIF/GPS được loại bỏ trong quá trình xử lý. Bản demo
        không có tài khoản khách hàng.
      </p>
      <h2>Tra cứu đơn</h2>
      <p>
        Tra cứu cần cả mã đơn và số điện thoại đã dùng khi đặt. Hệ thống không đặt thông tin này
        trong đường dẫn trang; số điện thoại tra cứu được xử lý riêng ở máy chủ.
      </p>
      <h2>Thông tin cần xác nhận</h2>
      <p>
        Thời hạn lưu ảnh và dữ liệu đơn, quy trình yêu cầu xóa, đầu mối xử lý quyền riêng tư và
        thông tin đơn vị vận hành: <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <p>
        Email hỗ trợ, số điện thoại, địa chỉ và thời gian tiếp nhận yêu cầu:{' '}
        <strong>[CẦN XÁC NHẬN]</strong>.
      </p>
      <p>Không gửi ảnh riêng tư hoặc thông tin thanh toán qua kênh chưa được Harméa xác nhận.</p>
    </>
  );
}

export function ContentPage({ name }: { name: RouteName }) {
  if (!(name in pages)) return null;
  const pageName = name as ContentPageName;
  const { title, eyebrow } = pages[pageName];
  const content = {
    about: <AboutPage />,
    'how-nfc-works': <NfcPage />,
    faq: <FaqPage />,
    'shipping-policy': <ShippingPage />,
    'returns-policy': <ReturnsPage />,
    'privacy-policy': <PrivacyPage />,
    contact: <ContactPage />
  }[pageName];

  return (
    <article className="content-page">
      <p className="content-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <div className="content-body">{content}</div>
      <nav className="content-related" aria-label="Thông tin liên quan">
        <Link to="/faq">Câu hỏi thường gặp</Link>
        <Link to="/policies/privacy">Quyền riêng tư</Link>
        <Link to="/contact">Liên hệ</Link>
      </nav>
    </article>
  );
}

export function NotFoundPage() {
  return (
    <section className="content-page" aria-labelledby="not-found-title">
      <p className="content-eyebrow">404</p>
      <h1 id="not-found-title">Không tìm thấy trang</h1>
      <p>Địa chỉ này không tồn tại hoặc đã thay đổi.</p>
      <p className="content-actions">
        <Link className="button primary" to="/">
          Về trang chủ
        </Link>
      </p>
    </section>
  );
}
