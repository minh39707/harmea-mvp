import { randomBytes, randomUUID } from 'node:crypto';
import type { Database } from '../../db.ts';
import { hash } from '../../lib/crypto.ts';
import { InputError } from '../../lib/errors.ts';
import { productSnapshot } from '../catalog/product.ts';
import { orderPayload } from './validation.ts';
import { parsePayload, validateParts, decodeFile, saveAsset, cleanup } from './uploads.ts';
import { addEvent } from './repository.ts';

export async function createOrder(db: Database, root: string, form: FormData) {
  const payload = orderPayload(parsePayload(form));
  validateParts(form, payload.items.length);
  if ((await db.query('SELECT id FROM orders WHERE request_key=$1', [payload.requestKey])).rows[0])
    throw new InputError(
      'Yêu cầu đã được lưu. Liên hệ cửa hàng nếu chưa nhận được liên kết.',
      'DUPLICATE_REQUEST',
      409
    );
  const created: string[] = [];
  try {
    const items: Array<
      ReturnType<typeof orderPayload>['items'][number] & {
        id: string;
        photoKey: string;
        previewKey: string;
      }
    > = [];
    for (const [i, item] of payload.items.entries()) {
      const photo = await decodeFile(form.get(`photo_${i}`), 'photo');
      const preview = await decodeFile(form.get(`preview_${i}`), 'preview');
      items.push({
        ...item,
        id: randomUUID(),
        photoKey: await saveAsset(root, photo, created),
        previewKey: await saveAsset(root, preview, created)
      });
    }
    const token = randomBytes(32).toString('base64url');
    const result = await db.transaction(async tx => {
      const product = (await tx.query('SELECT * FROM products WHERE is_active=true FOR SHARE'))
        .rows[0];
      if (
        !product ||
        items.some(
          i => i.productId !== product.id || i.templateVersion !== product.template_version
        )
      )
        throw new InputError('Sản phẩm hoặc mẫu đã thay đổi.', 'PRODUCT_CHANGED', 409);
      const snapshot = productSnapshot(product);
      const quantity = items.reduce((n, i) => n + i.quantity, 0);
      const subtotal = quantity * snapshot.unitPriceVnd;
      const id = randomUUID(),
        number = `HM-${id.replaceAll('-', '').slice(0, 16).toUpperCase()}`;
      const first = items[0]!;
      const inserted = await tx.query(
        'INSERT INTO orders(id,order_number,request_key,product_id,product_snapshot,design_snapshot,recipient_snapshot,quantity,unit_price_vnd,subtotal_vnd,customer_note,photo_key,preview_key,tracking_token_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
        [
          id,
          number,
          payload.requestKey,
          product.id,
          JSON.stringify(snapshot),
          JSON.stringify(first.design),
          JSON.stringify(payload.recipient),
          quantity,
          snapshot.unitPriceVnd,
          subtotal,
          payload.note,
          first.photoKey,
          first.previewKey,
          hash(token)
        ]
      );
      for (const [position, item] of items.entries())
        await tx.query(
          'INSERT INTO order_items(id,order_id,position,design_snapshot,quantity,photo_key,preview_key) VALUES($1,$2,$3,$4,$5,$6,$7)',
          [
            item.id,
            id,
            position,
            JSON.stringify(item.design),
            item.quantity,
            item.photoKey,
            item.previewKey
          ]
        );
      await addEvent(tx, randomUUID(), id, 1, null, 'pending', 'guest');
      return inserted.rows[0]!;
    });
    return {
      id: result.id,
      orderNumber: result.order_number,
      status: result.status,
      quantity: result.quantity,
      unitPriceVnd: result.unit_price_vnd,
      subtotalVnd: result.subtotal_vnd,
      shippingFeeVnd: null,
      currency: 'VND',
      trackingToken: token,
      createdAt: result.created_at
    };
  } catch (error) {
    await cleanup(root, created);
    if (
      (error as { code?: string; constraint?: string }).code === '23505' &&
      (error as { constraint?: string }).constraint === 'orders_request_key_key'
    )
      throw new InputError('Yêu cầu đã được lưu.', 'DUPLICATE_REQUEST', 409);
    throw error;
  }
}
