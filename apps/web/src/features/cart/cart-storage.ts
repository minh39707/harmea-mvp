import type { Item, Design } from '../../shared/types';
import { validCrop } from '../editor/geometry.ts';
const strings = [
  'fullName',
  'signatureText',
  'musicUrl',
  'place',
  'dateOfBirth',
  'commemorativeDate',
  'color',
  'photo'
] as const;
function storedItem(raw: unknown): Item | null {
  if (!raw || typeof raw !== 'object') return null;
  const i = raw as Record<string, unknown>,
    d = i.design as Record<string, unknown> | undefined;
  if (
    typeof i.id !== 'string' ||
    typeof i.productId !== 'string' ||
    !Number.isInteger(i.quantity) ||
    Number(i.quantity) < 1 ||
    Number(i.quantity) > 10 ||
    !d ||
    strings.some(k => typeof d[k] !== 'string')
  )
    return null;
  const texts = Object.fromEntries(strings.map(k => [k, d[k]])) as Pick<
    Design,
    (typeof strings)[number]
  >;
  if (
    texts.fullName.length > 80 ||
    texts.place.length > 120 ||
    texts.signatureText.length > 80 ||
    texts.musicUrl.length > 2048 ||
    texts.photo.length > 350000 ||
    texts.dateOfBirth.length > 10 ||
    texts.commemorativeDate.length > 10
  )
    return null;
  const crop =
    d.crop && typeof d.crop === 'object' && validCrop(d.crop as Design['crop'])
      ? { ...(d.crop as Design['crop']) }
      : { x: 0, y: 0, width: 1, height: 1 };
  const dimension = (n: unknown) =>
    typeof n === 'number' && Number.isFinite(n) && n > 0 && n <= 8192 ? n : 0;
  return {
    id: i.id,
    productId: i.productId,
    quantity: Number(i.quantity),
    design: {
      ...texts,
      crop,
      photoWidth: dimension(d.photoWidth),
      photoHeight: dimension(d.photoHeight)
    },
    ...(typeof i.assetKey === 'string' && /^[0-9a-f-]{36}$/.test(i.assetKey)
      ? { assetKey: i.assetKey }
      : {}),
    ...(typeof i.templateVersion === 'string' && i.templateVersion.length <= 40
      ? { templateVersion: i.templateVersion }
      : {})
  };
}
export function loadCart(): Item[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem('harmea.cart.v2') ?? '[]');
    return parseCart(value);
  } catch {
    return [];
  }
}

export function parseCart(value: unknown): Item[] {
  return Array.isArray(value)
    ? value
        .map(storedItem)
        .filter((i): i is Item => i !== null)
        .slice(0, 10)
    : [];
}
export function saveCart(cart: Item[]) {
  localStorage.setItem('harmea.cart.v2', JSON.stringify(cart));
}
