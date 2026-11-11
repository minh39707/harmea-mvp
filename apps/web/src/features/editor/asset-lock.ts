type LockManagerLike = {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
};

export function withAssetStoreLock<T>(operation: () => Promise<T>) {
  const manager =
    typeof navigator === 'undefined'
      ? undefined
      : (navigator as Navigator & { locks?: LockManagerLike }).locks;
  return manager ? manager.request('harmea.editor.asset-store.v1', operation) : operation();
}
