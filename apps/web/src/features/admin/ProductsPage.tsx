import { useEffect, useState } from 'react';
import { ApiError } from '../../shared/api';
import { money } from '../../shared/format';
import { adminProducts, updateAdminProduct } from './client';
import type { AdminProduct } from './types';

type Draft = { name: string; description: string; price: string; isActive: boolean };
const draftFrom = (product: AdminProduct): Draft => ({
  name: product.name,
  description: product.description,
  price: String(product.unitPriceVnd),
  isActive: product.isActive
});

export default function ProductsPage() {
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void adminProducts(controller.signal)
      .then(products => {
        const current = products[0] ?? null;
        setProduct(current);
        setDraft(current ? draftFrom(current) : null);
      })
      .catch(cause => {
        if (!controller.signal.aborted)
          setError(cause instanceof Error ? cause.message : 'Không tải được sản phẩm.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [revision]);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !draft || saving) return;
    const price = Number(draft.price);
    if (
      !draft.name.trim() ||
      draft.name.trim().length > 200 ||
      draft.description.length > 5000 ||
      !Number.isSafeInteger(price) ||
      price < 1000 ||
      price > 10000000
    ) {
      setError('Kiểm tra tên, mô tả và giá sản phẩm trước khi lưu.');
      return;
    }
    const priceChanged = price !== product.unitPriceVnd;
    const activeChanged = draft.isActive !== product.isActive;
    if (
      (priceChanged || activeChanged) &&
      !window.confirm(
        priceChanged && activeChanged
          ? `Xác nhận đổi giá từ ${money(product.unitPriceVnd)} sang ${money(price)} và ${draft.isActive ? 'bật' : 'tắt'} nhận đơn? Đơn đã tạo vẫn giữ giá cũ.`
          : priceChanged
            ? `Xác nhận đổi giá từ ${money(product.unitPriceVnd)} sang ${money(price)}? Đơn đã tạo vẫn giữ giá cũ.`
            : `Xác nhận ${draft.isActive ? 'bật' : 'tắt'} nhận đơn cho sản phẩm?`
      )
    )
      return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await updateAdminProduct(product.id, {
        expectedVersion: product.version,
        name: draft.name.trim(),
        description: draft.description.trim(),
        unitPriceVnd: price,
        isActive: draft.isActive
      });
      setProduct(updated);
      setDraft(draftFrom(updated));
      setNotice('Đã lưu sản phẩm.');
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        setNotice('Sản phẩm đã được cập nhật ở nơi khác. Đã tải lại dữ liệu mới.');
        setRevision(value => value + 1);
      } else setError(cause instanceof Error ? cause.message : 'Không lưu được sản phẩm.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section>
      <h1>Sản phẩm</h1>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải sản phẩm…</p>
      ) : !product || !draft ? (
        <p>Chưa có sản phẩm trong danh mục.</p>
      ) : (
        <form className="admin-panel admin-product-form" onSubmit={event => void save(event)}>
          <p>
            Phiên bản dữ liệu: {product.version} · Mẫu: {product.templateVersion}
          </p>
          <label>
            Tên sản phẩm
            <input
              required
              maxLength={200}
              value={draft.name}
              onChange={event => setDraft({ ...draft, name: event.target.value })}
            />
          </label>
          <label>
            Mô tả
            <textarea
              rows={5}
              maxLength={5000}
              value={draft.description}
              onChange={event => setDraft({ ...draft, description: event.target.value })}
            />
          </label>
          <label>
            Giá mỗi thẻ (VND)
            <input
              required
              type="number"
              min={1000}
              max={10000000}
              step={1}
              value={draft.price}
              onChange={event => setDraft({ ...draft, price: event.target.value })}
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={event => setDraft({ ...draft, isActive: event.target.checked })}
            />
            <span>Đang nhận đơn</span>
          </label>
          <p>
            Trạng thái hiện tại:{' '}
            <strong>{product.isActive ? 'Đang bán' : 'Tạm ngừng nhận đơn'}</strong>
          </p>
          <button className="button primary" type="submit" disabled={saving || loading}>
            {saving ? 'Đang lưu…' : 'Lưu sản phẩm'}
          </button>
        </form>
      )}
    </section>
  );
}
