import { useRef, useState } from 'react';
import { api } from '../../shared/api';
import { money } from '../../shared/format';
import './PaymentPanel.css';
import DemoQr from './DemoQr';

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
      setError(
        cause instanceof Error ? cause.message : 'Chưa hoàn tất được đơn demo. Hãy thử lại.'
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="transfer-panel" aria-labelledby="transfer-title">
      <p className="demo-payment-banner" role="alert">
        THANH TOÁN DEMO – KHÔNG CHUYỂN TIỀN
      </p>
      <h2 id="transfer-title">Thanh toán bằng QR</h2>
      <p>Đây là bước mô phỏng. Không quét mã, không chuyển tiền.</p>
      <strong className="transfer-amount">{money(amount)}</strong>
      <p className="note">
        Gồm tiền sản phẩm và phí vận chuyển (demo). Không có khoản tiền nào được thu.
      </p>
      <DemoQr />
      <p>
        Mã đơn demo: <strong className="transfer-reference">{orderNumber}</strong>
      </p>
      {reportedAt ? (
        <p className="transfer-reported" role="status">
          Đã hoàn tất đơn demo. Không có giao dịch tiền thật nào được thực hiện.
        </p>
      ) : (
        <button
          type="button"
          className="button primary"
          disabled={busy}
          onClick={() => void confirmTransfer()}
        >
          {busy ? 'Đang hoàn tất…' : 'Hoàn tất đơn demo'}
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
