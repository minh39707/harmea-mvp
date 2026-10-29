import type { Recipient } from '../../shared/types.ts';
import type { preparedItem } from '../editor/prepared-item.ts';

export type PreparedItem = Awaited<ReturnType<typeof preparedItem>>;
export function orderInput(items: PreparedItem[], recipient: Recipient, confirmed: boolean) {
  if (!confirmed) throw Error('Vui lòng kiểm tra và xác nhận thiết kế.');
  if (items.length < 1 || items.length > 10) throw Error('Một đơn cần từ 1 đến 10 thiết kế.');
  const name = recipient.name.trim(),
    phone = recipient.phone.trim(),
    address = recipient.address.trim(),
    note = recipient.note.trim();
  if (
    !name ||
    name.length > 80 ||
    !/^\+?[0-9]{8,15}$/.test(phone) ||
    address.length < 10 ||
    address.length > 500 ||
    note.length > 500
  )
    throw Error(
      'Kiểm tra tên (1–80 ký tự), điện thoại (8–15 chữ số), địa chỉ (10–500 ký tự) và ghi chú (tối đa 500).'
    );
  for (const item of items) {
    if (
      !Number.isInteger(item.payload.quantity) ||
      item.payload.quantity < 1 ||
      item.payload.quantity > 10
    )
      throw Error('Số lượng mỗi thiết kế từ 1 đến 10.');
    if (
      !item.photo.size ||
      item.photo.size > 5 * 1024 * 1024 ||
      !['image/jpeg', 'image/png'].includes(item.photo.type) ||
      !item.preview.size ||
      item.preview.size > 2 * 1024 * 1024 ||
      item.preview.type !== 'image/png'
    )
      throw Error('Ảnh gốc/preview không đúng định dạng hoặc vượt giới hạn.');
  }
  const payload = {
    items: items.map(i => i.payload),
    recipient: { name, phone, address },
    note,
    designConfirmed: true as const
  };
  // Reserve 16 KiB for native FormData boundaries/headers and requestKey.
  const size =
    new TextEncoder().encode(JSON.stringify(payload)).length +
    items.reduce((n, i) => n + i.photo.size + i.preview.size, 0) +
    16384;
  if (size > 16 * 1024 * 1024)
    throw Error('Gói thiết kế quá lớn (giới hạn 16 MiB). Giảm dung lượng ảnh và lưu lại thiết kế.');
  if (JSON.stringify(payload).length + 100 > 65536)
    throw Error('Nội dung đơn quá dài. Hãy rút ngắn các trường chữ.');
  return payload;
}
export function orderForm(
  payload: ReturnType<typeof orderInput>,
  items: PreparedItem[],
  requestKey: string
) {
  const form = new FormData();
  form.set('payload', JSON.stringify({ requestKey, ...payload }));
  items.forEach((item, i) => {
    form.set(
      `photo_${i}`,
      item.photo,
      `photo-${i}.${item.photo.type === 'image/png' ? 'png' : 'jpg'}`
    );
    form.set(`preview_${i}`, item.preview, `preview-${i}.png`);
  });
  return form;
}
async function digest(data: BufferSource) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', data))]
    .map(n => n.toString(16).padStart(2, '0'))
    .join('');
}
export async function orderFingerprint(
  payload: ReturnType<typeof orderInput>,
  items: PreparedItem[]
) {
  const files = [];
  for (const item of items) {
    files.push(await digest(await item.photo.arrayBuffer()));
    files.push(await digest(await item.preview.arrayBuffer()));
  }
  return digest(new TextEncoder().encode(JSON.stringify({ payload, files })));
}
