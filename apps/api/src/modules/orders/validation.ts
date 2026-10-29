import { InputError } from '../../lib/errors.ts';
import { object, text, date, uuid, isAllowedMusicUrl } from '../../lib/validate.ts';

export function fields(input: unknown, allowed: string[]) {
  const value = object(input);
  if (Object.keys(value).some(k => !allowed.includes(k)))
    throw new InputError('Có trường không được hỗ trợ.');
  return value;
}
export function id(value: unknown) {
  if (typeof value !== 'string' || !uuid.test(value)) throw new InputError('ID không hợp lệ.');
  return value;
}
export function integer(value: unknown, min: number, max: number) {
  if (!Number.isSafeInteger(value) || Number(value) < min || Number(value) > max)
    throw new InputError('Số lượng hoặc phiên bản không hợp lệ.');
  return Number(value);
}
function optionalDate(value: unknown, label: string) {
  if (value === undefined) return undefined;
  const parsed = date(value, label);
  if (!parsed) throw new InputError(`${label} không hợp lệ.`);
  return parsed;
}
export function designSnapshot(input: unknown) {
  const d = fields(input, [
    'fullName',
    'dateOfBirth',
    'place',
    'commemorativeDate',
    'signatureText',
    'musicUrl',
    'crop',
    'color'
  ]);
  const crop = fields(d.crop, ['x', 'y', 'width', 'height']);
  for (const key of ['x', 'y', 'width', 'height']) {
    const n = crop[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 1)
      throw new InputError('Crop không hợp lệ.');
  }
  const x = Number(crop.x),
    y = Number(crop.y),
    width = Number(crop.width),
    height = Number(crop.height);
  if (width <= 0 || height <= 0 || x + width > 1 || y + height > 1)
    throw new InputError('Crop vượt biên ảnh.');
  const dateOfBirth = optionalDate(d.dateOfBirth, 'Ngày sinh');
  const commemorativeDate = optionalDate(d.commemorativeDate, 'Ngày kỷ niệm');
  if (
    dateOfBirth &&
    dateOfBirth >
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date())
  )
    throw new InputError('Ngày sinh không được ở tương lai.');
  const musicUrl = text(d.musicUrl, 'liên kết nhạc', 2048);
  let url: URL;
  try {
    url = new URL(musicUrl);
  } catch {
    throw new InputError('Liên kết nhạc không hợp lệ.');
  }
  if (!isAllowedMusicUrl(url))
    throw new InputError('Dùng link HTTPS từ Spotify, YouTube hoặc SoundCloud.');
  const color = d.color === undefined ? 'cream' : text(d.color, 'màu', 12);
  if (!['cream', 'blue', 'rose'].includes(color)) throw new InputError('Màu thẻ không hợp lệ.');
  return {
    fullName: text(d.fullName, 'tên trên thẻ', 80),
    musicUrl,
    color,
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(commemorativeDate ? { commemorativeDate } : {}),
    ...(d.place === undefined ? {} : { place: text(d.place, 'địa điểm', 120, false) }),
    ...(d.signatureText === undefined
      ? {}
      : { signatureText: text(d.signatureText, 'chữ ký', 80, false) }),
    crop: { x, y, width, height }
  };
}
export function orderPayload(input: unknown) {
  const b = fields(input, ['requestKey', 'items', 'recipient', 'note', 'designConfirmed']);
  if (b.designConfirmed !== true) throw new InputError('Vui lòng xác nhận thiết kế.');
  if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 10)
    throw new InputError('Một đơn có từ 1 đến 10 thiết kế.');
  const items = b.items.map(raw => {
    const i = fields(raw, ['productId', 'templateVersion', 'quantity', 'design']);
    return {
      productId: id(i.productId),
      templateVersion: text(i.templateVersion, 'phiên bản mẫu', 40),
      quantity: integer(i.quantity, 1, 10),
      design: designSnapshot(i.design)
    };
  });
  const r = fields(b.recipient, ['name', 'phone', 'address']);
  const recipient = {
    name: text(r.name, 'người nhận', 80),
    phone: text(r.phone, 'điện thoại', 16),
    address: text(r.address, 'địa chỉ', 500)
  };
  if (!/^\+?[0-9]{8,15}$/.test(recipient.phone) || recipient.address.length < 10)
    throw new InputError('Điện thoại hoặc địa chỉ không hợp lệ.');
  return {
    requestKey: id(b.requestKey),
    items,
    recipient,
    note: text(b.note, 'ghi chú', 500, false)
  };
}
