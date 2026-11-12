import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import type { Metadata, Sharp } from 'sharp';
import { InputError } from '../../lib/errors.ts';
import type { FileStorage } from '../../lib/storage/types.ts';

export const requestLimit = 16 * 1024 * 1024;
const maxInputPixels = 40_000_000;

export function imageSettings(env: NodeJS.ProcessEnv = process.env) {
  const setting = (name: string, fallback: number, min: number, max: number) => {
    const raw = env[name];
    if (raw === undefined || raw === '') return fallback;
    const value = Number(raw);
    if (!Number.isInteger(value) || value < min || value > max)
      throw Error(`${name} must be an integer between ${min} and ${max}.`);
    return value;
  };
  return {
    maxEdge: setting('PHOTO_MAX_EDGE', 2400, 1, 8192),
    jpegQuality: setting('PHOTO_JPEG_QUALITY', 82, 1, 100)
  };
}

export type ExpectedPhotoSize = { width: number; height: number };

export function orientedPhotoSize(width: number, height: number, orientation?: number) {
  return orientation !== undefined && [5, 6, 7, 8].includes(orientation)
    ? { width: height, height: width }
    : { width, height };
}
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
export async function decodeFile(
  value: FormDataEntryValue | null,
  kind: 'photo' | 'preview',
  expectedPhotoSize?: ExpectedPhotoSize
) {
  if (typeof value === 'string' || !value) throw new InputError('Thiếu ảnh.');
  const limit = (kind === 'photo' ? 5 : 2) * 1024 * 1024;
  if (value.size > limit) throw new InputError('Tệp quá lớn.', 'FILE_TOO_LARGE', 413);
  if (
    !value.size ||
    !(kind === 'preview' ? ['image/png'] : ['image/png', 'image/jpeg']).includes(value.type)
  )
    throw new InputError('Định dạng ảnh không hợp lệ.', 'UNSUPPORTED_MEDIA_TYPE', 415);
  const bytes = Buffer.from(await value.arrayBuffer());
  let image: Sharp;
  let meta: Metadata;
  try {
    image = sharp(bytes, { limitInputPixels: maxInputPixels, failOn: 'warning' });
    meta = await image.metadata();
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
  } catch {
    throw new InputError(
      'Không giải mã được ảnh hoặc ảnh vượt giới hạn.',
      'UNSUPPORTED_MEDIA_TYPE',
      415
    );
  }
  try {
    if (kind === 'preview') {
      const normalized = await image.png({ compressionLevel: 9 }).toBuffer();
      return { bytes: normalized, extension: 'png' as const };
    }

    const oriented = orientedPhotoSize(meta.width!, meta.height!, meta.orientation);
    if (
      expectedPhotoSize &&
      (oriented.width !== expectedPhotoSize.width || oriented.height !== expectedPhotoSize.height)
    )
      throw new InputError(
        'Ảnh bị xoay khác với bản xem trước, hãy chọn lại ảnh',
        'PHOTO_ORIENTATION_MISMATCH',
        422
      );
    const { maxEdge, jpegQuality } = imageSettings();
    const normalized = await image
      .rotate()
      .flatten({ background: '#ffffff' })
      .toColourspace('srgb')
      .resize(maxEdge, maxEdge, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: jpegQuality, mozjpeg: true })
      .toBuffer();
    return { bytes: normalized, extension: 'jpg' as const };
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError(
      'Không giải mã được ảnh hoặc ảnh vượt giới hạn.',
      'UNSUPPORTED_MEDIA_TYPE',
      415
    );
  }
}
export async function saveAsset(
  storage: FileStorage,
  file: Awaited<ReturnType<typeof decodeFile>>,
  created: string[]
) {
  const key = `${randomUUID()}.${file.extension}`;
  await storage.put(key, file.bytes, file.extension === 'jpg' ? 'image/jpeg' : 'image/png');
  created.push(key);
  return key;
}
export async function cleanup(storage: FileStorage, keys: string[]) {
  const results = await Promise.allSettled(keys.map(key => storage.delete(key)));
  if (results.some(result => result.status === 'rejected'))
    throw new Error('Could not remove all files from a failed order.');
}
