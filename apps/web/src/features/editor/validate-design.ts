import type { Design } from '../../shared/types.ts';
import { validCrop } from './geometry.ts';
import { validMusic } from './music-url.ts';

export function orderDesign(design: Design) {
  if (!design.fullName.trim() || design.fullName.trim().length > 80)
    throw Error('Tên trên thẻ cần từ 1 đến 80 ký tự.');
  if (design.place.trim().length > 120 || design.signatureText.trim().length > 80)
    throw Error('Địa điểm tối đa 120 và chữ ký tối đa 80 ký tự.');
  if (!validMusic(design.musicUrl.trim()) || design.musicUrl.trim().length > 2048)
    throw Error('Dùng link HTTPS từ Spotify, YouTube hoặc SoundCloud.');
  if (!validCrop(design.crop)) throw Error('Vùng cắt ảnh không hợp lệ.');
  if (!['cream', 'blue', 'rose'].includes(design.color)) throw Error('Màu thẻ không hợp lệ.');
  for (const value of [design.dateOfBirth, design.commemorativeDate]) {
    if (
      value &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) ||
        new Date(value).toISOString().slice(0, 10) !== value)
    )
      throw Error('Ngày không hợp lệ.');
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
    new Date()
  );
  if (design.dateOfBirth > today) throw Error('Ngày sinh không được ở tương lai.');
  return {
    fullName: design.fullName.trim(),
    musicUrl: design.musicUrl.trim(),
    color: design.color,
    crop: { ...design.crop },
    ...(design.place.trim() ? { place: design.place.trim() } : {}),
    ...(design.signatureText.trim() ? { signatureText: design.signatureText.trim() } : {}),
    ...(design.dateOfBirth ? { dateOfBirth: design.dateOfBirth } : {}),
    ...(design.commemorativeDate ? { commemorativeDate: design.commemorativeDate } : {})
  };
}
