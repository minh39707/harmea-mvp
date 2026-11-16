import type { Crop } from '../../shared/types';

export const PHOTO_MAX_EDGE = 2400;
export const PRINT_MIN_WIDTH = 673;
export const PRINT_MIN_HEIGHT = 1063;

export function fitWithin(width: number, height: number, maxEdge = PHOTO_MAX_EDGE) {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 1 ||
    height < 1 ||
    !Number.isFinite(maxEdge) ||
    maxEdge < 1
  )
    throw Error('Kích thước ảnh không hợp lệ.');
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale))
  };
}

export function cropPrintResolution(width: number, height: number, crop: Crop) {
  return {
    width: Math.floor(width * crop.width),
    height: Math.floor(height * crop.height)
  };
}

export function hasLowPrintResolution(width: number, height: number, crop: Crop) {
  const region = cropPrintResolution(width, height, crop);
  return region.width < PRINT_MIN_WIDTH || region.height < PRINT_MIN_HEIGHT;
}

export function formatImageBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
