import type { Crop } from '../../shared/types.ts';

export const template = {
  version: 'harmea-card-v1',
  width: 1024,
  height: 650,
  physical: { x: 20, y: 15, width: 984, height: 620 },
  safe: { x: 50, y: 40, width: 924, height: 570 },
  portrait: { x: 102, y: 116, width: 389, height: 388 }
} as const;

export function validCrop(c: Crop) {
  return (
    [c.x, c.y, c.width, c.height].every(Number.isFinite) &&
    c.x >= 0 &&
    c.y >= 0 &&
    c.width > 0 &&
    c.height > 0 &&
    c.x + c.width <= 1 &&
    c.y + c.height <= 1
  );
}

export function centerCrop(width: number, height: number, zoom = 1): Crop {
  if (width <= 0 || height <= 0 || !Number.isFinite(width + height + zoom) || zoom < 1 || zoom > 3)
    throw Error('Kích thước ảnh không hợp lệ.');
  const frame = template.portrait.width / template.portrait.height,
    image = width / height;
  const w = Math.min(1, frame / image) / zoom,
    h = Math.min(1, image / frame) / zoom;
  return { x: (1 - w) / 2, y: (1 - h) / 2, width: w, height: h };
}

export function moveCrop(crop: Crop, axis: 'x' | 'y', fraction: number): Crop {
  const size = axis === 'x' ? crop.width : crop.height;
  return { ...crop, [axis]: Math.max(0, Math.min(1, fraction)) * (1 - size) };
}

export function zoomCrop(crop: Crop, width: number, height: number, zoom: number): Crop {
  const next = centerCrop(width, height, zoom);
  return {
    ...next,
    x: Math.max(0, Math.min(1 - next.width, crop.x + crop.width / 2 - next.width / 2)),
    y: Math.max(0, Math.min(1 - next.height, crop.y + crop.height / 2 - next.height / 2))
  };
}
