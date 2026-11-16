import type { EditorAssets } from '../../shared/types';
import { cleanOrphanAssetKeys } from './orphan-assets.ts';
import { withAssetStoreLock } from './asset-lock.ts';

function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(Error('Trình duyệt không hỗ trợ lưu ảnh gốc.'));
      return;
    }
    const request = indexedDB.open('harmea.editor.v1', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('assets');
    };
    let blocked = false;
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => reject(Error('Không mở được bộ nhớ ảnh trên thiết bị.'));
    request.onblocked = () => {
      blocked = true;
      reject(Error('Đóng tab Harméa khác rồi thử lưu ảnh lại.'));
    };
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openStore();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction('assets', mode),
        request = run(tx.objectStore('assets'));
      tx.oncomplete = () => resolve(request.result);
      tx.onabort = () =>
        reject(Error('Không lưu được ảnh. Kiểm tra dung lượng hoặc quyền lưu trên thiết bị.'));
      tx.onerror = () => reject(Error('Bộ nhớ ảnh không khả dụng.'));
    });
  } finally {
    db.close();
  }
}
export async function saveAssets(assets: EditorAssets) {
  const key = crypto.randomUUID();
  await transaction('readwrite', store => store.put(assets, key));
  return key;
}
export async function loadAssets(key: string): Promise<EditorAssets | null> {
  const value = await transaction<EditorAssets | undefined>('readonly', store => store.get(key));
  return value?.photo instanceof Blob && value.preview instanceof Blob ? value : null;
}
export async function removeAssets(key: string) {
  await transaction('readwrite', store => store.delete(key));
}

export async function cleanOrphanAssets(getReferencedKeys: () => Iterable<string>) {
  return withAssetStoreLock(async () => {
    const keys = await transaction<IDBValidKey[]>('readonly', store => store.getAllKeys());
    const orphans = await cleanOrphanAssetKeys(
      keys.filter((key): key is string => typeof key === 'string'),
      getReferencedKeys(),
      removeAssets
    );
    return orphans.length;
  });
}
