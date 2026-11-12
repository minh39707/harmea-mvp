import { useEffect, useState } from 'react';
import { money } from '../../shared/format';
import { statusLabels } from '../../shared/order-status';
import type { OrderStatus } from '../../shared/types';
import { adminStats } from './client';
import type { AdminStats } from './types';

function vietnamToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
}
function addDays(value: string, amount: number) {
  return new Date(Date.parse(`${value}T00:00:00.000Z`) + amount * 86400000)
    .toISOString()
    .slice(0, 10);
}

export default function StatsPage() {
  const today = vietnamToday();
  const [from, setFrom] = useState(addDays(today, -29));
  const [to, setTo] = useState(today);
  const [applied, setApplied] = useState({ from: addDays(today, -29), to: today });
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError('');
    void adminStats(applied.from, applied.to, controller.signal)
      .then(setStats)
      .catch(cause => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Không tải được thống kê.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [applied]);

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const days =
      (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86400000 + 1;
    if (!from || !to || from > to || days > 366) {
      setError('Chọn khoảng ngày hợp lệ, tối đa 366 ngày.');
      return;
    }
    setApplied({ from, to });
  }

  const maxCount = Math.max(1, ...(stats?.ordersByDay.map(day => day.orderCount) ?? [0]));
  const chartWidth = 900;
  const chartHeight = 250;
  const chartBase = 210;
  const slot = stats?.ordersByDay.length ? chartWidth / stats.ordersByDay.length : chartWidth;

  return (
    <section>
      <h1>Thống kê</h1>
      <form className="admin-toolbar" onSubmit={apply}>
        <label>
          Từ ngày (giờ Việt Nam)
          <input type="date" value={from} onChange={event => setFrom(event.target.value)} />
        </label>
        <label>
          Đến ngày
          <input type="date" value={to} onChange={event => setTo(event.target.value)} />
        </label>
        <button className="button secondary" type="submit" disabled={busy}>
          Xem thống kê
        </button>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang tính thống kê…</p>}
      {stats && (
        <>
          <div className="admin-stats-summary">
            <article className="admin-panel">
              <h2>Doanh thu tạm tính</h2>
              <strong>{money(stats.subtotalVnd)}</strong>
              <p>Không gồm đơn đã hủy; chưa phải doanh thu đã thanh toán.</p>
            </article>
            <article className="admin-panel">
              <h2>Số thẻ</h2>
              <strong>{stats.cardCount}</strong>
              <p>Trong các đơn chưa hủy.</p>
            </article>
          </div>
          <section className="admin-panel">
            <h2>Đơn hàng theo trạng thái</h2>
            <div className="admin-status-grid">
              {(Object.keys(statusLabels) as OrderStatus[]).map(status => (
                <article key={status}>
                  <span>{statusLabels[status]}</span>
                  <strong>{stats.ordersByStatus[status]}</strong>
                </article>
              ))}
            </div>
          </section>
          <section className="admin-panel">
            <h2>Đơn hàng theo ngày</h2>
            <p>
              {applied.from} đến {applied.to} · giờ Việt Nam
            </p>
            <div className="admin-chart-wrap">
              <svg
                className="admin-chart"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label={`Số đơn theo ngày từ ${applied.from} đến ${applied.to}`}
              >
                <line x1="0" y1={chartBase} x2={chartWidth} y2={chartBase} />
                {stats.ordersByDay.map((day, index) => {
                  const barHeight = (day.orderCount / maxCount) * 170;
                  const barWidth = Math.max(1, Math.min(20, slot * 0.65));
                  return (
                    <rect
                      key={day.date}
                      x={index * slot + (slot - barWidth) / 2}
                      y={chartBase - barHeight}
                      width={barWidth}
                      height={barHeight}
                      rx="2"
                    >
                      <title>
                        {day.date}: {day.orderCount} đơn
                      </title>
                    </rect>
                  );
                })}
                <text x="0" y="240">
                  {stats.ordersByDay[0]?.date}
                </text>
                <text x={chartWidth} y="240" textAnchor="end">
                  {stats.ordersByDay.at(-1)?.date}
                </text>
              </svg>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
