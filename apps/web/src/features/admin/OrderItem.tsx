import { useState } from 'react';
import type { AdminItem } from './types';
import PrivateAsset from './PrivateAsset';
export default function OrderItem({
  item,
  orderId,
  index,
  onUnauthorized
}: {
  item: AdminItem;
  orderId: string;
  index: number;
  onUnauthorized: () => void;
}) {
  const [original, setOriginal] = useState(false),
    d = item.designSnapshot;
  return (
    <article className="admin-panel">
      <h3>
        Thiết kế {index + 1}: {d.fullName} · {item.quantity} thẻ
      </h3>
      <div className="admin-item-grid">
        <div>
          <PrivateAsset
            key={original ? 'photo' : 'preview'}
            orderId={orderId}
            itemId={item.id}
            kind={original ? 'photo' : 'preview'}
            path={original ? item.assets.photo : item.assets.preview}
            onUnauthorized={onUnauthorized}
          />
          <button className="button secondary" onClick={() => setOriginal(value => !value)}>
            {original ? 'Xem preview đã chốt' : 'Xem ảnh gốc'}
          </button>
          <div className="admin-toolbar">
            <a href={item.assets.photo} download>
              Tải ảnh gốc
            </a>
            <a href={item.assets.preview} download>
              Tải PNG preview
            </a>
          </div>
        </div>
        <div>
          <dl>
            <dt>Tên</dt>
            <dd>{d.fullName}</dd>
            <dt>Ngày sinh</dt>
            <dd>{d.dateOfBirth || 'Không nhập'}</dd>
            <dt>Địa điểm</dt>
            <dd>{d.place || 'Không nhập'}</dd>
            <dt>Ngày kỷ niệm</dt>
            <dd>{d.commemorativeDate || 'Không nhập'}</dd>
            <dt>Chữ ký</dt>
            <dd>{d.signatureText || 'Không nhập'}</dd>
            <dt>Màu</dt>
            <dd>{d.color || 'cream'}</dd>
            <dt>Crop chuẩn hóa</dt>
            <dd>
              <code>{JSON.stringify(d.crop)}</code>
            </dd>
          </dl>
          <label>
            URL nhạc để đối chiếu/ghi NFC
            <input readOnly value={d.musicUrl} onFocus={e => e.target.select()} />
          </label>
          <p className="note">
            Đối chiếu PNG với ảnh gốc/crop và các trường chữ trước khi sản xuất. Preview chưa phải
            file in đã kiểm chứng.
          </p>
        </div>
      </div>
    </article>
  );
}
