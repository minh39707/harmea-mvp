import { useMemo } from 'react';
import type { Design } from '../../shared/types';
import { cardSvg } from './card-svg';

export default function CardPreview({
  design,
  small = false,
  guides = false
}: {
  design: Design;
  small?: boolean;
  guides?: boolean;
}) {
  const src = useMemo(
    () => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cardSvg(design, guides))}`,
    [design, guides]
  );
  return (
    <div className={`music-card ${small ? 'small' : ''}`}>
      <img
        src={src}
        alt={`Thiết kế thẻ ${design.fullName || 'Harméa'}${design.dateOfBirth ? `, ngày sinh ${design.dateOfBirth}` : ''}`}
      />
    </div>
  );
}
