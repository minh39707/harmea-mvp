import type { Design } from '../../shared/types.ts';
import { template, validCrop } from './geometry.ts';
import { escapeXml, fittedText, displayDate } from './text-layout.ts';

const palettes: Record<string, string> = { cream: '#e8dfc8', blue: '#c2d3df', rose: '#e6c9c2' };
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
  const label = (text: string, y: number) =>
    `<text x="${safe.x}" y="${y}" font-size="11" font-family="Arial, sans-serif" letter-spacing="1.5">${text}</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${palettes[design.color] ?? palettes.cream}"/>
  <g fill="#383d35">
  <text x="40" y="70" font-family="Georgia, serif" font-size="25" letter-spacing="3">HARMÉA</text>
  <text x="530" y="67" text-anchor="end" font-family="Arial, sans-serif" font-size="10">MEMORY PASS / 001</text>
  <path d="M40 88H530" stroke="#746c59" stroke-width="1"/>
  ${label('THIS SONG BELONGS TO', 116)}
  ${fittedText(design.fullName || 'Your favorite person', 40, 150, 490, 3, 30, 18, 33, true)}
  ${design.dateOfBirth ? `<text x="40" y="242" font-family="Arial, sans-serif" font-size="14">${escapeXml(displayDate(design.dateOfBirth))}</text>` : ''}
  <rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="#f8f7ed"/>
  ${hasPhoto ? `<svg x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" viewBox="${c.x * iw} ${c.y * ih} ${c.width * iw} ${c.height * ih}" preserveAspectRatio="xMidYMid slice" overflow="hidden"><image href="${escapeXml(design.photo)}" width="${iw}" height="${ih}" preserveAspectRatio="${design.photoWidth && design.photoHeight ? 'none' : 'xMidYMid slice'}"/></svg>` : `<text x="285" y="440" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="#9e8965">h♪</text>`}
  ${label('A PLACE TO REMEMBER', 615)}
  ${fittedText(design.place || 'Somewhere with you', 40, 639, 490, 3, 18, 10, 19)}
  ${label('A MOMENT TO KEEP', 694)}
  ${fittedText(design.commemorativeDate ? displayDate(design.commemorativeDate) : 'A memory, forever.', 40, 720, 490, 1, 18, 13, 22)}
  ${fittedText(design.signatureText || 'with love', 40, 762, 490, 2, 22, 12, 26, true)}
  <path d="M40 815H530" stroke="#746c59" stroke-width="1"/>
  <text x="40" y="840" font-family="Arial, sans-serif" font-size="10" letter-spacing="1">TAP INTO A MEMORY</text>
  <text x="530" y="840" text-anchor="end" font-family="Arial, sans-serif" font-size="10">NFC MUSIC CARD</text>
  </g>
  ${guides ? `<g fill="none" stroke-width="1.5" stroke-dasharray="6 4"><rect x="${physical.x}" y="${physical.y}" width="${physical.width}" height="${physical.height}" stroke="#7b523a"/><rect x="${safe.x}" y="${safe.y}" width="${safe.width}" height="${safe.height}" stroke="#366a51"/></g>` : ''}
  </svg>`;
}
