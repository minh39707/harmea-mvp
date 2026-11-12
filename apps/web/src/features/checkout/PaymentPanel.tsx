import { useRef, useState } from 'react';
import { api } from '../../shared/api';
import { money } from '../../shared/format';
import './PaymentPanel.css';

export default function PaymentPanel({
  orderNumber,
  amount,
  phone
}: {
  orderNumber: string;
  amount: number;
  phone: string;
}) {
  const [busy, setBusy] = useState(false);
  const [reportedAt, setReportedAt] = useState('');
  const [error, setError] = useState('');
  const [imageFailed, setImageFailed] = useState(false);
  const locked = useRef(false);

  async function confirmTransfer() {
    if (locked.current || reportedAt) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await api<{ orderNumber: string; reportedAt: string }>(
        '/tracking/payment-confirm',
        { orderNumber, phone }
      );
      if (result.orderNumber !== orderNumber || !Number.isFinite(Date.parse(result.reportedAt)))
        throw new Error('Chưa xác nhận được kết quả. Vui lòng thử lại.');
      setReportedAt(result.reportedAt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Chưa gửi được xác nhận. Hãy thử lại.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="transfer-panel" aria-labelledby="transfer-title">
      <h2 id="transfer-title">Thanh toán bằng QR</h2>
      <p>Quét mã bằng ứng dụng ngân hàng, nhập số tiền và nội dung bên dưới.</p>
      <strong className="transfer-amount">{money(amount)}</strong>
      <p className="note">Tiền sản phẩm, chưa bao gồm phí giao hàng.</p>
      {imageFailed ? (
        <p role="alert">Không tải được mã QR. Vui lòng tải lại trang hoặc liên hệ cửa hàng.</p>
      ) : (
        <img
          className="transfer-qr"
          src="/images/payment-qr.png"
          alt="Mã QR chuyển khoản của Harméa"
          width={280}
          height={280}
          onError={() => setImageFailed(true)}
        />
      )}
      <p>
        Nội dung chuyển khoản: <strong className="transfer-reference">{orderNumber}</strong>
      </p>
      <p className="note">Kiểm tra người nhận trong ứng dụng ngân hàng trước khi chuyển tiền.</p>
      {reportedAt ? (
        <p className="transfer-reported" role="status">
          Đã ghi nhận bạn báo chuyển khoản. Cửa hàng sẽ kiểm tra giao dịch.
        </p>
      ) : (
        <button
          type="button"
          className="button primary"
          disabled={busy || imageFailed}
          onClick={() => void confirmTransfer()}
        >
          {busy ? 'Đang gửi xác nhận…' : 'Tôi đã chuyển khoản'}
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
