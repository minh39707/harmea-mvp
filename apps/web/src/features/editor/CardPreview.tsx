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
  const svgMarkup = useMemo(() => cardSvg(design, guides), [design, guides]);

  return (
    <div
      className={`music-card ${small ? 'small' : ''}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}
