import { constants } from 'node:fs';
import { lstat, mkdir, open, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { FileStorage } from './types.ts';
import { FileNotFound, isMissingFile, StorageUnavailable, validateKey } from './types.ts';

export class LocalFileStorage implements FileStorage {
  readonly root: string;

  constructor(root: string) {
    this.root = resolve(root);
  }

  private path(key: string) {
    return resolve(this.root, validateKey(key));
  }

  async put(key: string, buffer: Buffer, _contentType: string) {
    const path = this.path(key);
    try {
      await mkdir(this.root, { recursive: true, mode: 0o700 });
      const file = await open(path, 'wx', 0o600);
      try {
        await file.writeFile(buffer);
      } catch (error) {
        await unlink(path).catch(() => undefined);
        throw error;
      } finally {
        await file.close();
      }
    } catch {
      throw new StorageUnavailable();
    }
  }

  async get(key: string) {
    const path = this.path(key);
    try {
      if (!(await lstat(path)).isFile()) throw new FileNotFound();
      const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      if (!(await file.stat()).isFile()) {
        await file.close();
        throw new FileNotFound();
      }
      return file.createReadStream();
    } catch (error) {
      if (error instanceof FileNotFound || isMissingFile(error)) throw new FileNotFound();
      throw new StorageUnavailable();
    }
  }

  async delete(key: string) {
    const path = this.path(key);
    try {
      await unlink(path);
    } catch (error) {
      if (!isMissingFile(error)) throw new StorageUnavailable();
    }
  }

  async exists(key: string) {
    try {
      const stream = await this.get(key);
      stream.destroy();
      return true;
    } catch (error) {
      if (error instanceof FileNotFound) return false;
      throw error;
    }
  }
}
