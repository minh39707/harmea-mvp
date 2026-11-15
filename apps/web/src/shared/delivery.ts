// Ước tính ngày giao hàng (F4). Sửa các hằng số dưới đây khi đổi thời gian sản xuất/giao.

/** Số ngày làm việc để làm thẻ, tính từ ngày sau ngày đặt. */
export const PRODUCTION_DAYS = 1;
/** Số ngày làm việc giao hàng sau khi làm xong thẻ: ít nhất / nhiều nhất. */
export const SHIPPING_DAYS_MIN = 2;
export const SHIPPING_DAYS_MAX = 4;
/** Múi giờ dùng để xác định "hôm nay" của đơn. */
export const DELIVERY_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const weekdayLabels = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/** Ngày lịch (năm/tháng/ngày) của thời điểm `at` theo múi giờ Việt Nam, đặt ở 00:00 UTC. */
function calendarDate(at: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DELIVERY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day')));
}

/** Cộng `days` ngày làm việc (bỏ qua Chủ nhật), bắt đầu đếm từ ngày hôm sau. */
function addWorkingDays(start: Date, days: number): Date {
  const d = new Date(start);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0) left -= 1;
  }
  return d;
}

export function formatDeliveryDay(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${weekdayLabels[d.getUTCDay()]}, ${dd}/${mm}`;
}

export type DeliveryEstimate = { earliest: Date; latest: Date; label: string };

/**
 * Khoảng ngày giao dự kiến cho đơn đặt lúc `orderDate`.
 * Ví dụ label: "Thứ Tư, 18/11 – Thứ Sáu, 20/11".
 */
export function estimateDelivery(orderDate: Date | string = new Date()): DeliveryEstimate {
  const at = typeof orderDate === 'string' ? new Date(orderDate) : orderDate;
  const day = calendarDate(Number.isFinite(at.getTime()) ? at : new Date());
  const produced = addWorkingDays(day, PRODUCTION_DAYS);
  const earliest = addWorkingDays(produced, SHIPPING_DAYS_MIN);
  const latest = addWorkingDays(produced, SHIPPING_DAYS_MAX);
  return {
    earliest,
    latest,
    label: `${formatDeliveryDay(earliest)} – ${formatDeliveryDay(latest)}`
  };
}

/** Cách ghi phí vận chuyển dùng chung cho giỏ, checkout, thanh toán, trang đã nhận đơn (F5). */
export const SHIPPING_FEE_LABEL = 'Xác nhận trước khi giao';
export const SHIPPING_FEE_NOTE =
  'Phí vận chuyển chưa cộng vào tổng tiền và sẽ được cửa hàng xác nhận với bạn trước khi giao hàng.';

export const DELIVERY_NOTE = `Gồm ${PRODUCTION_DAYS} ngày làm thẻ và ${SHIPPING_DAYS_MIN}–${SHIPPING_DAYS_MAX} ngày giao, không tính Chủ nhật.`;
