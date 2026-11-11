import type { Shop } from '../../app/useShop';
import { blankDesign as blank } from '../../shared/types';
import { statusLabels } from '../../shared/order-status';
import { money } from '../../shared/format';

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
      <h1>Đã nhận đơn</h1>
      <p className="success-order-number">{receipt.orderNumber}</p>
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
        <button
          className="button secondary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(receipt.orderNumber);
              setNotice('Đã sao chép mã đơn.');
            } catch {
              setError(`Hãy sao chép mã đơn ${receipt.orderNumber} để lưu lại.`);
            }
          }}
        >
          Sao chép mã đơn
        </button>
        <button
          className="button primary"
          onClick={() => {
            setTrackOrderNumber(receipt.orderNumber);
            go('tracking');
          }}
        >
          Tra cứu tiến độ →
        </button>
        <p className="note">
          Demo, không thu tiền. Lưu mã đơn; tra cứu tại /track bằng mã đơn và số điện thoại đã nhập.
          Thông tin người nhận và thiết kế không được hiển thị công khai.
        </p>
      </div>
      <button
        className="text-button"
        onClick={() => {
          setDraft({ ...blank });
          go('product');
        }}
      >
        ← Về sản phẩm
      </button>
    </section>
  );
}
