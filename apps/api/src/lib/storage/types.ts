import type { Readable } from 'node:stream';

export interface FileStorage {
  put(key: string, buffer: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  close?(): void;
}

export class FileNotFound extends Error {
  constructor() {
    super('Stored file not found.');
  }
}

export class StorageUnavailable extends Error {
  constructor() {
    super('File storage is unavailable.');
  }
}

export function validateKey(key: string) {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,199}$/.test(key)) throw new Error('Invalid storage key.');
  return key;
}

export function isMissingFile(error: unknown) {
  return !!error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
}
