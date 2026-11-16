import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { Design, Item, Product, View, StateSetter } from '../../shared/types';
import { blankDesign } from '../../shared/types';
import { usePhotoAsset } from './usePhotoAsset';
import { previewPng, downloadPng } from './export-preview';
import { saveAssets, removeAssets } from './asset-store';
import { orderDesign } from './validate-design';
import { template } from './geometry';
type EditorState = {
  view: View;
  product: Product | null;
  cart: Item[];
  ready?: boolean;
  draft: Design;
  quantity: number;
  editing: string | null;
  editingPosition?: number | null;
  setDraft: StateSetter<Design>;
  setQuantity: StateSetter<number>;
  setEditing: StateSetter<string | null>;
  setEditingPosition?: StateSetter<number | null>;
  setGallery: StateSetter<'sample' | 'preview'>;
  setError: StateSetter<string>;
  setNotice: StateSetter<string>;
  setCart?: StateSetter<Item[]>;
  commitCart?: (action: Item[] | ((current: Item[]) => Item[]), cleanupRemoved?: boolean) => Item[];
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
  setEditingPosition,
  setGallery,
  setError,
  setNotice,
  setCart,
  commitCart,
  go
}: EditorState) {
  const assets = usePhotoAsset({ view, setDraft, setGallery, setError });
  const [saving, setSaving] = useState(false),
    [saveStatus, setSaveStatus] = useState(''),
    locked = useRef(false);
  const latestCart = useRef(cart);
  latestCart.current = cart;
  const editorBusy = saving || assets.loading;
  function update<K extends keyof Design>(key: K, value: Design[K]) {
    if (key === 'photo' && value === '') {
      assets.clearPhoto();
      setError('');
      return;
    }
    setDraft(d => ({ ...d, [key]: value }));
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
  async function saveItem(targetEditing: string | null) {
    if (!product || editorBusy || locked.current) return;
    locked.current = true;
    setSaving(true);
    setSaveStatus('Đang lưu…');
    setError('');
    try {
      if (product.templateVersion !== template.version)
        throw Error('Phiên bản mẫu đã thay đổi. Tải lại sản phẩm trước khi thêm.');
      if (!targetEditing && cart.length >= 10) throw Error('Mỗi giỏ tối đa 10 thiết kế.');
      const snapshot = structuredClone(draft);
      orderDesign(snapshot);
      const photo = assets.originalFor(snapshot);
      if (!photo || !snapshot.photo)
        throw Error('Chọn ảnh gốc JPG/PNG. Thiết kế cũ cần chọn lại ảnh.');
      const before = cart.find(i => i.id === targetEditing);
      if (targetEditing && !before)
        throw Error('Thiết kế trong giỏ đã được xóa. Hãy tạo thiết kế mới.');
      const preview = await previewPng(snapshot),
        assetKey = await saveAssets({ photo, preview });
      if (
        targetEditing
          ? latestCart.current.find(i => i.id === targetEditing) !== before
          : latestCart.current.length >= 10
      ) {
        await removeAssets(assetKey);
        throw Error('Giỏ hàng đã thay đổi. Mở sửa thiết kế và thử lại.');
      }
      const item: Item = {
        id: targetEditing ?? crypto.randomUUID(),
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
      const updateCart = commitCart ?? setCart;
      if (updateCart) {
        updateCart(old =>
          targetEditing ? old.map(i => (i.id === targetEditing ? item : i)) : [...old, item]
        );
      }
      setNotice(
        targetEditing
          ? 'Đã cập nhật thiết kế trong giỏ hàng.'
          : 'Đã thêm thẻ vào giỏ hàng thành công.'
      );
      setSaveStatus(targetEditing ? 'Đã cập nhật' : 'Đã lưu vào giỏ');
      setEditing(current => (current === targetEditing ? null : current));
      setEditingPosition?.(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không lưu được thiết kế.');
      setSaveStatus('');
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  async function add(e: FormEvent) {
    e.preventDefault();
    return saveItem(editing);
  }
  async function addAsNew() {
    return saveItem(null);
  }
  async function edit(item: Item) {
    if (locked.current || assets.loading) return;
    if (!(await assets.restore(item))) return;
    setDraft(structuredClone(item.design));
    setQuantity(item.quantity);
    setEditing(item.id);
    setEditingPosition?.(cart.findIndex(current => current.id === item.id) + 1);
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
  function startNewDesign() {
    if (editorBusy || locked.current) return;
    assets.clearPhoto();
    setDraft({ ...blankDesign });
    setQuantity(1);
    setEditing(null);
    setEditingPosition?.(null);
    setGallery('preview');
    setError('');
    setSaveStatus('');
  }
  return {
    startNewDesign,
    update,
    updateCrop,
    photo: assets.photo,
    photoStats: assets.photoStats,
    add,
    addAsNew,
    saveStatus,
    edit,
    exportPreview,
    editorBusy
  };
}
