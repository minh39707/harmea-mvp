import { randomUUID } from 'node:crypto';
import type { Database } from '../../db.ts';
import { text } from '../../lib/validate.ts';
import { InputError } from '../../lib/errors.ts';
import { fields, integer } from './validation.ts';
import { addEvent, getOrder, statuses } from './repository.ts';
import { detail } from './presentation.ts';

const transitions: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['producing', 'cancelled'],
  producing: ['shipping'],
  shipping: ['completed'],
  completed: [],
  cancelled: []
};
export async function updateStatus(db: Database, id: string, input: unknown) {
  const b = fields(input, ['expectedVersion', 'status', 'cancellationReason', 'trackingCode']);
  const expected = integer(b.expectedVersion, 1, 2147483646);
  const status = text(b.status, 'trạng thái', 16);
  if (!statuses.includes(status)) throw new InputError('Trạng thái không hợp lệ.');
  const reason =
    b.cancellationReason === undefined ? null : text(b.cancellationReason, 'lý do hủy', 500);
  const tracking = b.trackingCode === undefined ? null : text(b.trackingCode, 'mã vận đơn', 80);
  if (
    (status === 'cancelled' && !reason) ||
    (reason !== null && status !== 'cancelled') ||
    (tracking !== null && status !== 'shipping')
  )
    throw new InputError('Lý do hủy hoặc mã vận đơn không hợp lệ.');
  return db.transaction(async tx => {
    const order = (await getOrder(tx, id)).rows[0];
    if (!order) throw new InputError('Không tìm thấy đơn.', 'ORDER_NOT_FOUND', 404);
    if (order.version !== expected)
      throw new InputError(
        'Đơn đã được cập nhật. Tải lại trước khi thử lại.',
        'VERSION_CONFLICT',
        409
      );
    if (!transitions[String(order.status)]?.includes(status))
      throw new InputError('Không thể chuyển trạng thái này.', 'INVALID_TRANSITION', 409);
    const result = await tx.query(
      'UPDATE orders SET status=$1,version=version+1,tracking_code=COALESCE($2,tracking_code),cancellation_reason=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$4 AND version=$5 RETURNING id',
      [status, tracking, reason, id, expected]
    );
    if (!result.rows[0]) throw new InputError('Đơn đã được cập nhật.', 'VERSION_CONFLICT', 409);
    await addEvent(tx, randomUUID(), id, expected + 1, order.status, status, 'admin', reason);
    return detail(tx, id);
  });
}
