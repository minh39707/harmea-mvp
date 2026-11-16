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
        âm nhạc. Website này là sản phẩm demo của học phần E-Business tại Trường Đại học Hà Nội,
        không phải cửa hàng đang hoạt động và chưa mở bán thương mại.
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
        kết, cài ứng dụng hoặc đăng nhập vào dịch vụ âm nhạc. Bản demo mô phỏng quy trình thiết kế;
        loại chip, quy trình ghi thẻ và khả năng tương thích thiết bị phải được kiểm tra lại trước
        khi sản xuất thật.
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
          Đây là website demo cho dự án sinh viên nên không có thanh toán thật. Sau khi đặt đơn, bạn
          thấy bước thanh toán mô phỏng và bấm “Hoàn tất đơn demo”. Không quét mã, không chuyển
          tiền.
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
          Bản demo không giao hàng và không nhận đổi trả. Xem phạm vi mô phỏng tại{' '}
          <Link to="/policies/shipping">chính sách giao hàng</Link> và{' '}
          <Link to="/policies/returns">chính sách đổi trả</Link> trước khi sử dụng.
        </p>
      </details>
      <details>
        <summary>Tôi liên hệ với Harméa ở đâu?</summary>
        <p>
          Bản demo chưa vận hành kênh chăm sóc khách hàng. Xem thông tin phạm vi dự án tại trang{' '}
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
        Đây là bản demo học phần, không tiếp nhận đơn thương mại và không giao sản phẩm. Phí 30.000
        VND và khoảng ngày giao trên luồng checkout chỉ là dữ liệu mô phỏng để kiểm tra trải nghiệm
        người dùng; không phải báo giá hoặc cam kết vận chuyển.
      </p>
      <p>
        Nếu dự án chuyển sang kinh doanh thật, nhóm phải xác nhận khu vực giao, đơn vị vận chuyển,
        biểu phí và thời gian dự kiến trước khi nhận đơn. Xem thêm{' '}
        <Link to="/policies/returns">chính sách đổi trả</Link>.
      </p>
    </>
  );
}

function ReturnsPage() {
  return (
    <>
      <p>Bản demo không bán, sản xuất hoặc giao sản phẩm nên không phát sinh giao dịch đổi trả.</p>
      <p>
        Trước khi mở bán thật, nhóm phải công bố điều kiện đổi trả, thời hạn yêu cầu, quy trình gửi
        sản phẩm và bên chịu chi phí. Nội dung hiện tại chỉ mô tả phạm vi của bản demo học phần.
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
      <h2>Giới hạn của bản demo</h2>
      <p>
        Không dùng thông tin cá nhân thật hoặc ảnh riêng tư trên website demo. Dữ liệu demo có thể
        bị xóa khi nhóm đặt lại máy chủ. Dự án chưa có pháp nhân, đầu mối bảo vệ dữ liệu hoặc quy
        trình yêu cầu xóa dành cho khách hàng thương mại.
      </p>
    </>
  );
}

function ContactPage() {
  return (
    <>
      <p>
        Bản demo học phần chưa vận hành email, số điện thoại, địa chỉ hoặc thời gian hỗ trợ khách
        hàng. Thành viên lớp trao đổi với nhóm qua kênh học phần đã được giảng viên cung cấp.
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
