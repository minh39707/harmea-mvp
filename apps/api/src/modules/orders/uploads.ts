import type { Request } from 'express';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { InputError } from '../../lib/errors.ts';

export const requestLimit = 16 * 1024 * 1024;
export async function multipart(req: Request) {
  if (!req.is('multipart/form-data'))
    throw new InputError('Yêu cầu phải là multipart.', 'UNSUPPORTED_MEDIA_TYPE', 415);
  if (Number(req.headers['content-length']) > requestLimit)
    throw new InputError('Yêu cầu quá lớn.', 'REQUEST_TOO_LARGE', 413);
  const chunks: Buffer[] = [];
  let length = 0;
  req.setTimeout(30000, () => req.destroy());
  try {
    for await (const chunk of req.iterator({ destroyOnReturn: false })) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > requestLimit) throw new InputError('Yêu cầu quá lớn.', 'REQUEST_TOO_LARGE', 413);
      chunks.push(bytes);
    }
  } finally {
    req.setTimeout(0);
  }
  try {
    return await new globalThis.Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'Content-Type': req.headers['content-type']! },
      body: Buffer.concat(chunks)
    }).formData();
  } catch {
    throw new InputError('Multipart không hợp lệ.', 'INVALID_REQUEST', 400);
  }
}
export function parsePayload(form: FormData) {
  const value = form.get('payload');
  if (typeof value !== 'string' || value.length > 65536)
    throw new InputError('Payload JSON không hợp lệ.', 'INVALID_REQUEST', 400);
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new InputError('Payload JSON không hợp lệ.', 'INVALID_REQUEST', 400);
  }
}
export function validateParts(form: FormData, count: number) {
  const expected = [
    'payload',
    ...Array.from({ length: count }, (_, i) => [`photo_${i}`, `preview_${i}`]).flat()
  ];
  if (
    [...form.keys()].length !== expected.length ||
    expected.some(k => form.getAll(k).length !== 1)
  )
    throw new InputError('Thiếu, thừa hoặc lặp phần multipart.', 'INVALID_REQUEST', 400);
}
export async function decodeFile(value: FormDataEntryValue | null, kind: 'photo' | 'preview') {
  if (typeof value === 'string' || !value) throw new InputError('Thiếu ảnh.');
  const limit = (kind === 'photo' ? 5 : 2) * 1024 * 1024;
  if (value.size > limit) throw new InputError('Tệp quá lớn.', 'FILE_TOO_LARGE', 413);
  if (
    !value.size ||
    !(kind === 'preview' ? ['image/png'] : ['image/png', 'image/jpeg']).includes(value.type)
  )
    throw new InputError('Định dạng ảnh không hợp lệ.', 'UNSUPPORTED_MEDIA_TYPE', 415);
  const bytes = Buffer.from(await value.arrayBuffer());
  try {
    const image = sharp(bytes, { limitInputPixels: 20000000, failOn: 'warning' });
    const meta = await image.metadata();
    if (
      !meta.width ||
      !meta.height ||
      meta.width > 8192 ||
      meta.height > 8192 ||
      (meta.pages ?? 1) > 1
    )
      throw Error();
    const format = meta.format === 'jpeg' ? 'image/jpeg' : meta.format === 'png' ? 'image/png' : '';
    if (format !== value.type) throw Error();
    await image.stats(); // Force full decode, not just metadata/header sniffing.
    return { bytes, extension: meta.format === 'jpeg' ? 'jpg' : 'png' };
  } catch {
    throw new InputError(
      'Không giải mã được ảnh hoặc ảnh vượt giới hạn.',
      'UNSUPPORTED_MEDIA_TYPE',
      415
    );
  }
}
export async function saveAsset(
  root: string,
  file: Awaited<ReturnType<typeof decodeFile>>,
  created: string[]
) {
  await mkdir(root, { recursive: true });
  const key = `${randomUUID()}.${file.extension}`;
  await writeFile(resolve(root, key), file.bytes, { flag: 'wx', mode: 0o600 });
  created.push(key);
  return key;
}
export async function cleanup(root: string, keys: string[]) {
  await Promise.all(keys.map(key => unlink(resolve(root, key))));
}
