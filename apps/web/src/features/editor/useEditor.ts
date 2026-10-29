import type { FormEvent } from 'react';
import type { Design, Item, Product, View, StateSetter } from '../../shared/types';
import { validMusic } from './music-url';
import { photo as processPhoto } from './photo';
type EditorState = {
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
  function update(key: keyof Design, value: string) {
    setDraft(d => ({ ...d, [key]: value }));
    setGallery('preview');
    setError('');
  }
  const photo = (file: File | undefined) => processPhoto(file, update, setError);
  function add(e: FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (!validMusic(draft.musicUrl)) {
      setError('Dùng link HTTPS từ Spotify, YouTube hoặc SoundCloud.');
      return;
    }
    if (!draft.fullName.trim()) {
      setError('Nhập tên trên thẻ.');
      return;
    }
    if (!editing && cart.length >= 10) {
      setError('Mỗi giỏ tối đa 10 thiết kế.');
      return;
    }
    const item: Item = {
      id: editing ?? crypto.randomUUID(),
      productId: product.id,
      quantity,
      design: { ...draft, fullName: draft.fullName.trim(), musicUrl: draft.musicUrl.trim() }
    };
    setCart(old => (editing ? old.map(i => (i.id === editing ? item : i)) : [...old, item]));
    setNotice(editing ? 'Đã cập nhật thiết kế trong giỏ.' : 'Đã thêm thẻ của bạn vào giỏ hàng.');
    setEditing(null);
    setError('');
  }
  function edit(item: Item) {
    setDraft({ ...item.design });
    setQuantity(item.quantity);
    setEditing(item.id);
    setGallery('preview');
    go('product');
    setTimeout(
      () =>
        document
          .getElementById('personalize')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      100
    );
  }
  return { update, photo, add, edit };
}
