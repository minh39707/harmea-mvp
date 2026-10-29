import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Database } from '../../db.ts';
import { hash } from '../../lib/crypto.ts';
import { InputError } from '../../lib/errors.ts';
import { object, text, date, uuid, isAllowedMusicUrl } from '../../lib/validate.ts';
import { findRequest, activeProducts, insertCheckout } from './repository.ts';
import { checkoutReceipt } from './receipt.ts';
export async function createCheckout(db: Database, secret: string, input: unknown) {
  const { tokenFor, receipt } = checkoutReceipt(secret);
  const body = object(input);
  const requestKey = text(body.requestKey, 'mã yêu cầu', 36);
  if (!uuid.test(requestKey)) throw new InputError('Mã yêu cầu không hợp lệ.');
  if (body.confirmed !== true)
    throw new InputError('Vui lòng xác nhận đây là đơn thử, không thu tiền.');
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 10)
    throw new InputError('Giỏ hàng cần từ 1 đến 10 thiết kế.');
  const c = object(body.recipient);
  const recipient = {
    name: text(c.name, 'tên người nhận', 100),
    phone: text(c.phone, 'số điện thoại', 20),
    address: text(c.address, 'địa chỉ', 300),
    note: text(c.note, 'ghi chú', 500, false)
  };
  if (!/^(?:\+84|0)[0-9]{9}$/.test(recipient.phone.replace(/[\s.-]/g, '')))
    throw new InputError('Nhập số điện thoại Việt Nam hợp lệ.');
  const items: Array<{ productId: string; quantity: number; design: any }> = [];
  for (const raw of body.items) {
    const item = object(raw),
      d = object(item.design);
    if (!Number.isInteger(item.quantity) || Number(item.quantity) < 1 || Number(item.quantity) > 10)
      throw new InputError('Số lượng mỗi thiết kế từ 1 đến 10.');
    const design = {
      fullName: text(d.fullName, 'tên trên thẻ', 60),
      signatureText: text(d.signatureText, 'chữ ký', 40, false),
      place: text(d.place, 'địa điểm', 80, false),
      dateOfBirth: date(d.dateOfBirth, 'ngày sinh'),
      commemorativeDate: date(d.commemorativeDate, 'ngày kỷ niệm'),
      musicUrl: text(d.musicUrl, 'liên kết nhạc', 2048),
      color: text(d.color, 'màu thẻ', 12),
      photo: text(d.photo, 'ảnh', 350000, false)
    };
    if (!['cream', 'blue', 'rose'].includes(design.color))
      throw new InputError('Màu thẻ không hợp lệ.');
    if (
      design.dateOfBirth &&
      design.dateOfBirth >
        new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
    )
      throw new InputError('Ngày sinh không được ở tương lai.');
    let u: URL;
    try {
      u = new URL(design.musicUrl);
    } catch {
      throw new InputError('Liên kết nhạc không hợp lệ.');
    }
    if (!isAllowedMusicUrl(u))
      throw new InputError('Dùng link HTTPS từ Spotify, YouTube hoặc SoundCloud.');
    if (design.photo) {
      if (!/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(design.photo))
        throw new InputError('Ảnh cần là JPEG hoặc PNG.');
      try {
        const image = sharp(Buffer.from(design.photo.split(',')[1]!, 'base64'), {
          limitInputPixels: 20000000
        });
        const meta = await image.metadata();
        if (!meta.width || !meta.height || meta.width > 8192 || meta.height > 8192) throw Error();
        design.photo =
          'data:image/jpeg;base64,' +
          (
            await image
              .rotate()
              .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 80 })
              .toBuffer()
          ).toString('base64');
      } catch {
        throw new InputError('Không đọc được ảnh hoặc ảnh quá lớn.');
      }
    }
    items.push({
      productId: text(item.productId, 'sản phẩm', 36),
      quantity: Number(item.quantity),
      design
    });
  }
  const requestHash = hash(JSON.stringify({ items, recipient }));
  const existing = await findRequest(db, requestKey);
  if (existing.rows[0]) {
    if (existing.rows[0].request_hash !== requestHash)
      throw new InputError('Yêu cầu đã được dùng với nội dung khác.', 'REQUEST_CONFLICT', 409);
    return { status: 200, body: receipt(existing.rows[0], true) };
  }
  const result = await db.transaction(async tx => {
    const { rows } = await activeProducts(tx);
    const product = rows[0];
    if (!product || items.some(i => i.productId !== product.id))
      throw new InputError('Sản phẩm không còn nhận đơn.');
    const snapshot = items.map(i => ({
      ...i,
      productName: product.name,
      unitPriceVnd: Number(product.unit_price_vnd),
      templateVersion: product.template_version
    }));
    const subtotal = snapshot.reduce((n, i) => n + i.quantity * i.unitPriceVnd, 0);
    const id = randomUUID(),
      orderNumber = 'HM-' + id.replaceAll('-', '').slice(0, 12).toUpperCase();
    const inserted = await insertCheckout(tx, [
      id,
      orderNumber,
      requestKey,
      requestHash,
      hash(tokenFor(id)),
      JSON.stringify(snapshot),
      JSON.stringify(recipient),
      subtotal
    ]);
    if (inserted.rows[0]) return inserted.rows[0];
    const replay = await findRequest(tx, requestKey);
    if (!replay.rows[0] || replay.rows[0].request_hash !== requestHash)
      throw new InputError('Nội dung yêu cầu không khớp.', 'REQUEST_CONFLICT', 409);
    return replay.rows[0];
  });
  return { status: 201, body: receipt(result, true) };
}
