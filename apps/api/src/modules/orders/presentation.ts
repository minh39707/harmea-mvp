import type { SqlConnection } from '../../db.ts';
import { getItems, getHistory, getOrder } from './repository.ts';
import { InputError } from '../../lib/errors.ts';

export function summary(r: Record<string, unknown>) {
  return {
    id: r.id,
    orderNumber: r.order_number,
    recipientName: (r.recipient_snapshot as { name: string }).name,
    status: r.status,
    quantity: r.quantity,
    subtotalVnd: r.subtotal_vnd,
    shippingFeeVnd: null,
    currency: r.currency,
    version: r.version,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}
export async function detail(db: SqlConnection, orderId: string) {
  const r = (await getOrder(db, orderId)).rows[0];
  if (!r) throw new InputError('Không tìm thấy đơn.', 'ORDER_NOT_FOUND', 404);
  const items = (await getItems(db, orderId)).rows;
  const history = (await getHistory(db, orderId)).rows;
  return {
    ...summary(r),
    productSnapshot: r.product_snapshot,
    recipient: r.recipient_snapshot,
    note: r.customer_note,
    unitPriceVnd: r.unit_price_vnd,
    templateVersion: (r.product_snapshot as { templateVersion: string }).templateVersion,
    trackingCode: r.tracking_code,
    cancellationReason: r.cancellation_reason,
    items: items.map(i => ({
      id: i.id,
      quantity: i.quantity,
      designSnapshot: i.design_snapshot,
      assets: {
        photo: `/api/admin/orders/${orderId}/items/${i.id}/assets/photo`,
        preview: `/api/admin/orders/${orderId}/items/${i.id}/assets/preview`
      }
    })),
    history: history.map(e => ({
      id: e.id,
      fromStatus: e.from_status,
      toStatus: e.to_status,
      actor: e.actor,
      internalNote: e.internal_note,
      occurredAt: e.occurred_at
    }))
  };
}
