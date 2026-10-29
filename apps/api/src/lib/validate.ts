import { InputError } from './errors.ts';
const hosts = new Set([
  'open.spotify.com',
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'soundcloud.com',
  'www.soundcloud.com'
]);
export const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== 'object' || Array.isArray(v))
    throw new InputError('Dữ liệu không hợp lệ.');
  return v as Record<string, unknown>;
};
export function text(v: unknown, label: string, max: number, required = true) {
  if (typeof v !== 'string') {
    if (!required && v == null) return '';
    throw new InputError(`Kiểm tra ${label}.`);
  }
  const value = v.trim();
  if ((required && !value) || value.length > max)
    throw new InputError(`${label}: tối đa ${max} ký tự, không được bỏ trống nếu bắt buộc.`);
  return value;
}
export function date(v: unknown, label: string) {
  const value = text(v, label, 10, false);
  if (
    value &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    throw new InputError(`${label} không hợp lệ.`);
  return value;
}

export function isAllowedMusicUrl(u: URL) {
  return u.protocol === 'https:' && !u.username && !u.password && !u.port && hosts.has(u.hostname);
}
