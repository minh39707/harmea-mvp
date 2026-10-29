import { createHmac } from 'node:crypto';
export function checkoutReceipt(secret: string) {
  const tokenFor = (id: string) =>
    createHmac('sha256', secret).update(`harmea-checkout:${id}`).digest('base64url');
  const receipt = (r: Record<string, unknown>, includeToken = false) => ({
    orderNumber: r.order_number,
    status: r.status,
    subtotalVnd: r.subtotal_vnd,
    shippingFeeVnd: null,
    isTest: true,
    createdAt: r.created_at,
    ...(includeToken ? { trackingToken: tokenFor(String(r.id)) } : {})
  });
  return { tokenFor, receipt };
}
