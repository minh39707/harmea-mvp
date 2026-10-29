import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Design, Item, Product, View, StateSetter } from '../../shared/types';
import { usePhotoAsset } from './usePhotoAsset';
import { previewPng, downloadPng } from './export-preview';
import { saveAssets, removeAssets } from './asset-store';
import { orderDesign } from './validate-design';
import { template } from './geometry';
type EditorState = {
  view: View;
  product: Product | null;
  cart: Item[];
  draft: Design;
  quantity: number;
  editing: string | null;
  setDraft: StateSetter<Design>;
  setQuantity: StateSetter<number>;
  setEditing: StateSetter<string | null>;
  setGallery: StateSetter<'sample' | 'preview'>;
  setError: StateSetter<string>;
  setNotice: StateSetter<string>;
  setCart: StateSetter<Item[]>;
  go: (view: View) => void;
};
export function useEditor({
  view,
  product,
  cart,
  draft,
  quantity,
  editing,
  setDraft,
  setQuantity,
  setEditing,
  setGallery,
  setError,
  setNotice,
  setCart,
  go
}: EditorState) {
  const assets = usePhotoAsset({ view, setDraft, setGallery, setError });
  const [saving, setSaving] = useState(false),
    locked = useRef(false);
  const latestCart = useRef(cart);
  latestCart.current = cart;
  const editorBusy = saving || assets.loading;
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    if (key === 'photo' && value === '') {
      assets.clearPhoto();
      setGallery('preview');
      setError('');
      return;
    }
    setDraft(d => ({ ...d, [key]: value }));
    setGallery('preview');
    setError('');
  }
  function updateCrop(crop: Design['crop']) {
    update('crop', crop);
  }
  async function proof() {
    orderDesign(draft);
    if (!draft.photo || !assets.originalFor(draft))
      throw Error('Chọn ảnh gốc JPG/PNG. Thiết kế cũ cần chọn lại ảnh.');
    return previewPng(structuredClone(draft));
  }
  async function exportPreview() {
    if (editorBusy || locked.current) return;
    locked.current = true;
    setSaving(true);
    setError('');
    try {
      downloadPng(await proof());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không xuất được preview.');
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    if (!product || editorBusy || locked.current) return;
    locked.current = true;
    setSaving(true);
    setError('');
    try {
      if (product.templateVersion !== template.version)
        throw Error('Phiên bản mẫu đã thay đổi. Tải lại sản phẩm trước khi thêm.');
      if (!editing && cart.length >= 10) throw Error('Mỗi giỏ tối đa 10 thiết kế.');
      const snapshot = structuredClone(draft);
      orderDesign(snapshot);
      const photo = assets.originalFor(snapshot);
      if (!photo || !snapshot.photo)
        throw Error('Chọn ảnh gốc JPG/PNG. Thiết kế cũ cần chọn lại ảnh.');
      const before = cart.find(i => i.id === editing);
      if (editing && !before) throw Error('Thiết kế trong giỏ đã được xóa. Hãy tạo thiết kế mới.');
      const preview = await previewPng(snapshot),
        assetKey = await saveAssets({ photo, preview });
      if (
        editing
          ? latestCart.current.find(i => i.id === editing) !== before
          : latestCart.current.length >= 10
      ) {
        await removeAssets(assetKey);
        throw Error('Giỏ hàng đã thay đổi. Mở sửa thiết kế và thử lại.');
      }
      const item: Item = {
        id: editing ?? crypto.randomUUID(),
        productId: product.id,
        templateVersion: product.templateVersion,
        assetKey,
        quantity,
        design: {
          ...snapshot,
          fullName: snapshot.fullName.trim(),
          musicUrl: snapshot.musicUrl.trim()
        }
      };
      setCart(old => (editing ? old.map(i => (i.id === editing ? item : i)) : [...old, item]));
      setNotice(
        editing ? 'Đã cập nhật thiết kế và PNG trong giỏ.' : 'Đã thêm thiết kế và PNG vào giỏ hàng.'
      );
      setEditing(current => (current === editing ? null : current));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được thiết kế.');
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  async function edit(item: Item) {
    if (locked.current || assets.loading) return;
    if (!(await assets.restore(item))) return;
    setDraft(structuredClone(item.design));
    setQuantity(item.quantity);
    setEditing(item.id);
    setGallery('preview');
    go('product');
    if (!assets.originalFor(item.design))
      setError('Thiết kế cũ hoặc ảnh gốc không còn. Chọn lại ảnh trước khi lưu.');
    setTimeout(
      () =>
        document
          .getElementById('personalize')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100
    );
  }
  return { update, updateCrop, photo: assets.photo, add, edit, exportPreview, editorBusy };
}
