import type { Crop, Design } from '../../shared/types';
import { centerCrop, moveCrop, zoomCrop } from './geometry';

export default function CropControls({
  draft,
  onChange
}: {
  draft: Design;
  onChange: (crop: Crop) => void;
}) {
  if (!draft.photo || !draft.photoWidth || !draft.photoHeight) return null;
  const base = centerCrop(draft.photoWidth, draft.photoHeight),
    c = draft.crop;
  const zoom = Math.max(1, Math.min(3, base.width / c.width));
  return (
    <div className="crop-controls">
      <p>Điều chỉnh phần ảnh xuất hiện trên thẻ</p>
      <label>
        Phóng ảnh <output>{zoom.toFixed(2)}×</output>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={e =>
            onChange(zoomCrop(c, draft.photoWidth, draft.photoHeight, Number(e.target.value)))
          }
        />
      </label>
      {(['x', 'y'] as const).map(axis => {
        const free = 1 - (axis === 'x' ? c.width : c.height);
        return (
          <label key={axis}>
            {axis === 'x' ? 'Vị trí ngang' : 'Vị trí dọc'}
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              disabled={free <= 0.000001}
              value={free > 0 ? (c[axis] / free) * 100 : 50}
              onChange={e => onChange(moveCrop(c, axis, Number(e.target.value) / 100))}
            />
          </label>
        );
      })}
      <button
        type="button"
        className="text-button"
        onClick={() => onChange(centerCrop(draft.photoWidth, draft.photoHeight))}
      >
        Căn giữa ảnh
      </button>
    </div>
  );
}
