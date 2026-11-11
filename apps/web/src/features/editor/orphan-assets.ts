export function orphanAssetKeys(keys: Iterable<string>, referencedKeys: Iterable<string>) {
  const referenced = new Set(referencedKeys);
  return [...keys].filter(key => !referenced.has(key));
}

export async function cleanOrphanAssetKeys(
  keys: Iterable<string>,
  referencedKeys: Iterable<string>,
  remove: (key: string) => Promise<void>
) {
  const orphans = orphanAssetKeys(keys, referencedKeys);
  for (const key of orphans) await remove(key);
  return orphans;
}
