import type { Design } from '../../shared/types';
import { template, validCrop } from './geometry';
import { TEMPLATE_IMAGES, LAYOUT_BY_COLOR } from './card-svg';
import { displayDate } from './text-layout';

export async function previewPng(design: Design) {
  const canvas = document.createElement('canvas');
  canvas.width = template.width;
  canvas.height = template.height;
  const context = canvas.getContext('2d');
  if (!context) throw Error('Trình duyệt không tạo được preview.');

  // 1. Draw template background image (Cream, Blue, Rose)
  const bg = new Image();
  const colorKey = design.color in TEMPLATE_IMAGES ? design.color : 'cream';
  bg.src = TEMPLATE_IMAGES[colorKey] ?? '/images/template-blank-cream.jpg';
  await bg.decode();
  context.drawImage(bg, 0, 0, template.width, template.height);

  const layout = LAYOUT_BY_COLOR[colorKey] ?? LAYOUT_BY_COLOR.cream!;

  // 2. Draw user photo if present
  if (design.photo && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(design.photo)) {
    const photoImg = new Image();
    photoImg.src = design.photo;
    await photoImg.decode();
    const p = template.portrait;
    const c = validCrop(design.crop) ? design.crop : { x: 0, y: 0, width: 1, height: 1 };
    const sx = c.x * photoImg.naturalWidth,
      sy = c.y * photoImg.naturalHeight,
      sw = c.width * photoImg.naturalWidth,
      sh = c.height * photoImg.naturalHeight;
    context.save();
    context.beginPath();
    context.rect(p.x, p.y, p.width, p.height);
    context.clip();
    context.drawImage(photoImg, sx, sy, sw, sh, p.x, p.y, p.width, p.height);
    context.restore();
  }

  // 3. Draw text overlays on exact dotted lines for this color
  context.fillStyle = '#151816';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';

  // Dòng 1: Issued to
  if (design.fullName) {
    const size = design.fullName.length > 26 ? 16 : design.fullName.length > 18 ? 19 : 22;
    context.font = `bold ${size}px "Courier New", Courier, monospace`;
    context.fillText(design.fullName, 735, layout.line1);
  }

  // Dòng 2: Date of birth
  if (design.dateOfBirth) {
    context.font = 'bold 22px "Courier New", Courier, monospace';
    context.fillText(displayDate(design.dateOfBirth), 745, layout.line2);
  }

  // Dòng 3: Place of issue
  if (design.place) {
    const size = design.place.length > 26 ? 16 : design.place.length > 18 ? 19 : 22;
    context.font = `bold ${size}px "Courier New", Courier, monospace`;
    context.fillText(design.place, 745, layout.line3);
  }

  // Dòng 4: Date of issue
  if (design.commemorativeDate) {
    context.font = 'bold 22px "Courier New", Courier, monospace';
    context.fillText(displayDate(design.commemorativeDate), 745, layout.line4);
  }

  // Dòng 5: Signature (Hand-drawn signature image)
  if (
    design.signatureData &&
    /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(design.signatureData)
  ) {
    const sigImg = new Image();
    sigImg.src = design.signatureData;
    await sigImg.decode();
    const maxW = 220,
      maxH = 46;
    const scale = Math.min(maxW / sigImg.naturalWidth, maxH / sigImg.naturalHeight);
    const drawW = sigImg.naturalWidth * scale;
    const drawH = sigImg.naturalHeight * scale;
    const drawX = 660 - drawW / 2;
    const drawY = layout.sigBoxY + 46 - drawH; // Bottom-aligned to the signature dotted line
    context.drawImage(sigImg, drawX, drawY, drawW, drawH);
  }

  context.textAlign = 'start';

  const png = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(Error('Không xuất được PNG.'))),
      'image/png'
    )
  );
  if (png.size > 2 * 1024 * 1024) throw Error('Preview vượt 2 MiB. Hãy chọn ảnh nhỏ hơn.');
  return png;
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
