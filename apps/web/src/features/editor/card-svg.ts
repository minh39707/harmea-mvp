import type { Design } from '../../shared/types.ts';
import { template, validCrop } from './geometry.ts';
import { escapeXml, displayDate } from './text-layout.ts';

export const TEMPLATE_IMAGES: Record<string, string> = {
  cream: '/images/template-blank-cream.jpg',
  blue: '/images/template-blank-blue.jpg',
  rose: '/images/template-blank-rose.jpg'
};

export const LAYOUT_BY_COLOR: Record<
  string,
  { line1: number; line2: number; line3: number; line4: number; sigBoxY: number; sigY: number }
> = {
  cream: { line1: 162, line2: 200, line3: 238, line4: 276, sigBoxY: 494, sigY: 540 },
  blue: { line1: 173, line2: 209, line3: 246, line4: 282, sigBoxY: 491, sigY: 537 },
  rose: { line1: 171, line2: 208, line3: 245, line4: 282, sigBoxY: 494, sigY: 540 }
};

export function cardSvg(design: Design, guides = false) {
  const { width, height, safe, physical, portrait: p } = template;
  const c = validCrop(design.crop) ? design.crop : { x: 0, y: 0, width: 1, height: 1 };
  const iw =
      Number.isFinite(design.photoWidth) && design.photoWidth > 0 ? design.photoWidth : p.width,
    ih =
      Number.isFinite(design.photoHeight) && design.photoHeight > 0 ? design.photoHeight : p.height;
  const hasPhoto =
    /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(design.photo) &&
    design.photo.length <= 350000;

  const colorKey = design.color in TEMPLATE_IMAGES ? design.color : 'cream';
  const bgImg = TEMPLATE_IMAGES[colorKey];
  const layout = LAYOUT_BY_COLOR[colorKey] ?? LAYOUT_BY_COLOR.cream!;

  // Font sizing to ensure text never overflows dotted lines
  const nameFontSize = design.fullName.length > 26 ? 16 : design.fullName.length > 18 ? 19 : 22;
  const placeFontSize = design.place.length > 26 ? 16 : design.place.length > 18 ? 19 : 22;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <!-- 1. Background Blank Card Template (Kem, Xanh, Hồng) -->
  <image href="${bgImg}" width="${width}" height="${height}" preserveAspectRatio="none"/>

  <!-- 2. Khung ảnh người dùng (Photograph of Authorized traveler) -->
  ${
    hasPhoto
      ? `<svg x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" viewBox="${c.x * iw} ${c.y * ih} ${c.width * iw} ${c.height * ih}" preserveAspectRatio="xMidYMid slice" overflow="hidden">
          <image href="${escapeXml(design.photo)}" width="${iw}" height="${ih}" preserveAspectRatio="${design.photoWidth && design.photoHeight ? 'none' : 'xMidYMid slice'}"/>
        </svg>`
      : `<g>
          <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="rgba(240, 240, 240, 0.75)" stroke="#ccc" stroke-dasharray="6 4"/>
          <text x="${p.x + p.width / 2}" y="${p.y + p.height / 2 - 8}" text-anchor="middle" font-family="'Courier New', monospace" font-size="22" font-weight="bold" fill="#888888">Ảnh của bạn</text>
          <text x="${p.x + p.width / 2}" y="${p.y + p.height / 2 + 20}" text-anchor="middle" font-family="'DM Sans', Arial, sans-serif" font-size="14" fill="#999999">(Chọn ảnh ở cột bên phải)</text>
        </g>`
  }

  <!-- 3. Thông tin hiển thị nằm chính xác trên các đường chấm theo từng mẫu màu -->
  <!-- Dòng 1: Issued to -->
  ${
    design.fullName
      ? `<text x="735" y="${layout.line1}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="${nameFontSize}" font-weight="bold" fill="#151816" letter-spacing="1">${escapeXml(design.fullName)}</text>`
      : ''
  }

  <!-- Dòng 2: Date of birth -->
  ${
    design.dateOfBirth
      ? `<text x="745" y="${layout.line2}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="22" font-weight="bold" fill="#151816" letter-spacing="2">${escapeXml(displayDate(design.dateOfBirth))}</text>`
      : ''
  }

  <!-- Dòng 3: Place of issue -->
  ${
    design.place
      ? `<text x="745" y="${layout.line3}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="${placeFontSize}" font-weight="bold" fill="#151816" letter-spacing="1">${escapeXml(design.place)}</text>`
      : ''
  }

  <!-- Dòng 4: Date of issue -->
  ${
    design.commemorativeDate
      ? `<text x="745" y="${layout.line4}" text-anchor="middle" font-family="'Courier New', Courier, monospace" font-size="22" font-weight="bold" fill="#151816" letter-spacing="2">${escapeXml(displayDate(design.commemorativeDate))}</text>`
      : ''
  }

  <!-- Dòng 5: Signature of Authorized traveler -->
  ${
    design.signatureData
      ? `<image href="${design.signatureData}" x="550" y="${layout.sigBoxY}" width="220" height="46" preserveAspectRatio="xMidYMax meet"/>`
      : ''
  }

  <!-- 4. Đường cắt & vùng an toàn nếu được bật -->
  ${
    guides
      ? `<g fill="none" stroke-width="1.5" stroke-dasharray="6 4">
          <rect x="${physical.x}" y="${physical.y}" width="${physical.width}" height="${physical.height}" stroke="#7b523a"/>
          <rect x="${safe.x}" y="${safe.y}" width="${safe.width}" height="${safe.height}" stroke="#366a51"/>
        </g>`
      : ''
  }
</svg>`;
}
