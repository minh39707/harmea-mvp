import type { Shop } from '../../app/useShop';
import { blankDesign as blank } from '../../shared/types';
import { statusLabels } from '../../shared/order-status';
import { money } from '../../shared/format';

export default function SuccessPage({
  receipt,
  trackLink,
  setNotice,
  setError,
  error,
  setDraft,
  go
}: Pick<Shop, 'receipt' | 'trackLink' | 'setNotice' | 'setError' | 'error' | 'setDraft' | 'go'>) {
  if (!receipt) return null;
  return (
    <section className="success">
      <span className="success-mark">✓</span>
      <p className="eyebrow">ĐÃ LƯU VÀO HỆ THỐNG</p>
      <h1>
        Kỷ niệm của bạn
        <br />
        <em>đã có một nơi để đến.</em>
      </h1>
      <p>
        Đã nhận đơn thử <strong>{receipt.orderNumber}</strong>.<br />
        Không có khoản tiền nào được thu.
      </p>
      <div className="receipt-box">
        <div>
          <span>Trạng thái</span>
          <b>{statusLabels[receipt.status]}</b>
        </div>
        <div>
          <span>Tiền sản phẩm (demo)</span>
          <b>{money(receipt.subtotalVnd)}</b>
        </div>
        <div>
          <span>Số lượng thẻ</span>
          <b>{receipt.quantity}</b>
        </div>
        <label>
          Liên kết theo dõi riêng
          <input readOnly value={trackLink} onFocus={e => e.target.select()} />
        </label>
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(trackLink);
              setNotice('Đã sao chép liên kết theo dõi.');
            } catch {
              setError('Hãy chọn và sao chép liên kết trong ô phía trên.');
            }
          }}
        >
          Sao chép liên kết
        </button>
        <a className="button primary" href={trackLink}>
          Xem đơn thử →
        </a>
        <p className="fineprint">
          Lưu liên kết trước khi đóng trang. Người có liên kết có thể xem tiến độ; thông tin người
          nhận và thiết kế không được hiển thị công khai.
        </p>
        {error && <p className="error">{error}</p>}
      </div>
      <button
        className="text-button"
        onClick={() => {
          setDraft({ ...blank });
          go('product');
        }}
      >
        ← Trở lại bộ sưu tập
      </button>
    </section>
  );
}
