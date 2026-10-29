import type { Design } from '../../shared/types';
import { cardSvg } from './card-svg';
import { template } from './geometry';

export async function previewPng(design: Design) {
  // Only these system fonts are used in the SVG; unrelated web fonts must not block export.
  if (document.fonts)
    await Promise.all([document.fonts.load('16px Arial'), document.fonts.load('16px Georgia')]);
  const url = URL.createObjectURL(new Blob([cardSvg(design)], { type: 'image/svg+xml' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = template.width;
    canvas.height = template.height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('Trình duyệt không tạo được preview.');
    context.drawImage(image, 0, 0);
    const png = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(Error('Không xuất được PNG.'))),
        'image/png'
      )
    );
    if (png.size > 2 * 1024 * 1024) throw Error('Preview vượt 2 MiB. Hãy chọn ảnh nhỏ hơn.');
    return png;
  } catch (error) {
    if (error instanceof DOMException)
      throw Error('Không tạo được PNG. Hãy chọn lại ảnh và thử lại.');
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function downloadPng(blob: Blob) {
  const url = URL.createObjectURL(blob),
    a = document.createElement('a');
  a.href = url;
  a.download = 'harmea-preview.png';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
