import type { Shop } from '../../app/useShop';
import { blankDesign as blank } from '../../shared/types';
import { statusLabels } from '../../shared/order-status';
import { money } from '../../shared/format';
import { IconCheck, IconCopy, IconSearch } from '../../shared/ui/Icons';
import './SuccessPage.css';

export default function SuccessPage({
  receipt,
  setNotice,
  setError,
  setDraft,
  setTrackOrderNumber,
  go
}: Pick<
  Shop,
  'receipt' | 'setNotice' | 'setError' | 'error' | 'setDraft' | 'setTrackOrderNumber' | 'go'
>) {
  if (!receipt) return null;
  return (
    <section className="success">
      <div className="success-badge-circle">
        <IconCheck size={32} strokeWidth={2.5} color="#1b4332" />
      </div>
      <h1 className="success-title">Đã nhận đơn</h1>
      <p className="success-subtitle">Cửa hàng đã ghi nhận đơn thử của bạn. Demo không thu tiền.</p>

      <div className="receipt-box">
        <div className="receipt-order-header">
          <span className="order-header-label">MÃ ĐƠN HÀNG CỦA BẠN</span>
          <strong className="success-order-number">{receipt.orderNumber}</strong>
        </div>

        <div className="receipt-row">
          <span>Trạng thái:</span>
          <b className="status-badge">{statusLabels[receipt.status]}</b>
        </div>
        <div className="receipt-row">
          <span>Tiền sản phẩm (demo):</span>
          <strong className="amount-highlight">{money(receipt.subtotalVnd)}</strong>
        </div>
        <div className="receipt-row">
          <span>Số lượng thẻ NFC:</span>
          <b>{receipt.quantity} thẻ</b>
        </div>

        <div className="receipt-actions">
          <button
            type="button"
            className="btn-copy-order"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(receipt.orderNumber);
                setNotice('Đã sao chép mã đơn.');
              } catch {
                setError(`Hãy sao chép mã đơn ${receipt.orderNumber} để lưu lại.`);
              }
            }}
          >
            <IconCopy size={16} />
            <span>Sao chép mã đơn</span>
          </button>
          <button
            type="button"
            className="btn-track-order"
            onClick={() => {
              setTrackOrderNumber(receipt.orderNumber);
              go('tracking');
            }}
          >
            <IconSearch size={16} />
            <span>Tra cứu tiến độ ngay →</span>
          </button>
        </div>

        <p className="note success-note">
          Vui lòng lưu lại mã đơn hàng. Đây là đơn demo, chưa thu tiền hoặc giao hàng tự động. Tra
          cứu tại mục <em>Tra cứu đơn</em> bằng mã đơn và số điện thoại đã nhập.
        </p>
      </div>

      <button
        type="button"
        className="text-button btn-back-home"
        onClick={() => {
          setDraft({ ...blank });
          go('product');
        }}
      >
        ← Tiếp tục thiết kế thẻ mới
      </button>
    </section>
  );
}
