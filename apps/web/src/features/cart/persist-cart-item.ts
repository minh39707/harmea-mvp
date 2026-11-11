import type { EditorAssets, Item } from '../../shared/types';
import { withAssetStoreLock } from '../editor/asset-lock.ts';

export type CartItemDraft = Omit<Item, 'id' | 'assetKey'>;

export type CartItemStore = {
  loadCart(): Item[];
  saveCart(cart: Item[]): void;
  saveAssets(assets: EditorAssets): Promise<string>;
  removeAssets(key: string): Promise<void>;
};

export type PersistCartItemOptions = {
  draft: CartItemDraft;
  assets: EditorAssets;
  editing?: Item;
  makeId?: () => string;
};

function sameItem(current: Item, expected: Item) {
  return (
    current.id === expected.id &&
    current.assetKey === expected.assetKey &&
    current.quantity === expected.quantity &&
    JSON.stringify(current.design) === JSON.stringify(expected.design)
  );
}

async function removeWithRetry(store: CartItemStore, key: string) {
  try {
    await store.removeAssets(key);
  } catch (firstError) {
    try {
      await store.removeAssets(key);
    } catch {
      throw firstError;
    }
  }
}

function writeWithRetry(store: CartItemStore, cart: Item[]) {
  try {
    store.saveCart(cart);
  } catch (firstError) {
    try {
      store.saveCart(cart);
    } catch {
      throw firstError;
    }
  }
}

function compensateCartWrite(
  store: CartItemStore,
  id: string,
  newAssetKey: string,
  previous?: Item
) {
  const current = store.loadCart();
  const index = current.findIndex(item => item.id === id && item.assetKey === newAssetKey);
  if (index === -1) return;
  const restored = [...current];
  if (previous) restored[index] = previous;
  else restored.splice(index, 1);
  writeWithRetry(store, restored);
}

async function persistCartItemLocked(
  store: CartItemStore,
  { draft, assets, editing, makeId = () => crypto.randomUUID() }: PersistCartItemOptions
) {
  const firstRead = store.loadCart();
  if (!editing && firstRead.length >= 10)
    throw Error('Giỏ đã đủ 10 thẻ. Đặt hàng hoặc xóa bớt thẻ để tiếp tục.');
  if (editing) {
    const found = firstRead.find(item => item.id === editing.id);
    if (!found) throw Error('Thẻ này đã bị xóa ở tab khác. Hãy lưu thành thẻ mới.');
    if (!sameItem(found, editing))
      throw Error('Thẻ đã được thay đổi ở tab khác. Hãy tải lại trước khi lưu.');
  }

  const assetKey = await store.saveAssets(assets);
  const item: Item = { ...draft, id: editing?.id ?? makeId(), assetKey };
  try {
    const current = store.loadCart();
    const index = editing ? current.findIndex(candidate => candidate.id === editing.id) : -1;
    if (editing && index < 0) throw Error('Thẻ này đã bị xóa ở tab khác. Hãy lưu thành thẻ mới.');
    if (editing && !sameItem(current[index]!, editing))
      throw Error('Thẻ đã được thay đổi ở tab khác. Hãy tải lại trước khi lưu.');
    if (!editing && current.length >= 10)
      throw Error('Giỏ đã đủ 10 thẻ. Đặt hàng hoặc xóa bớt thẻ để tiếp tục.');

    const next = [...current];
    const previous = editing ? current[index] : undefined;
    if (editing) next[index] = item;
    else next.push(item);
    try {
      store.saveCart(next);
    } catch (error) {
      compensateCartWrite(store, item.id, assetKey, previous);
      throw error;
    }

    if (previous?.assetKey) {
      try {
        await store.removeAssets(previous.assetKey);
      } catch (error) {
        compensateCartWrite(store, item.id, assetKey, previous);
        throw error;
      }
    }
    return { item, index: editing ? index : next.length - 1 };
  } catch (error) {
    if (
      !store
        .loadCart()
        .some(candidate => candidate.id === item.id && candidate.assetKey === assetKey)
    )
      await removeWithRetry(store, assetKey);
    throw error;
  }
}

export function persistCartItem(store: CartItemStore, options: PersistCartItemOptions) {
  return withAssetStoreLock(() => persistCartItemLocked(store, options));
}
