import { createHash } from 'node:crypto';
import type { FileStorage } from './types.ts';

async function bytes(storage: FileStorage, key: string) {
  const stream = await storage.get(key);
  const chunks: Buffer[] = [];
  let length = 0;
  try {
    for await (const chunk of stream) {
      length += chunk.length;
      if (length > 16 * 1024 * 1024) throw new Error('Migration file exceeds the image limit.');
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } finally {
    stream.destroy();
  }
}

const checksum = (value: Buffer) => createHash('sha256').update(value).digest('hex');

export async function migrateUploads(
  source: FileStorage,
  destination: FileStorage | undefined,
  keys: AsyncIterable<string> | Iterable<string>
) {
  const result = { checked: 0, copied: 0, skipped: 0, dryRun: !destination };
  for await (const key of keys) {
    if (!/^[0-9a-f-]{36}\.(jpg|png)$/.test(key)) throw new Error('Invalid order asset key.');
    const input = await bytes(source, key);
    const hash = checksum(input);
    result.checked++;
    if (!destination) continue;
    if (await destination.exists(key)) {
      if (checksum(await bytes(destination, key)) !== hash)
        throw new Error('Existing destination checksum does not match; no file was overwritten.');
      result.skipped++;
      continue;
    }
    await destination.put(key, input, key.endsWith('.jpg') ? 'image/jpeg' : 'image/png');
    if (checksum(await bytes(destination, key)) !== hash)
      throw new Error('Destination checksum verification failed; source was retained.');
    result.copied++;
  }
  return result;
}
