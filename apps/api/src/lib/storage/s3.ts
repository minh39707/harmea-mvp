import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand
} from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';
import type { FileStorage } from './types.ts';
import { FileNotFound, StorageUnavailable, validateKey } from './types.ts';

function missing(error: unknown) {
  const value = error as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    value?.$metadata?.httpStatusCode === 404 ||
    ['NotFound', 'NoSuchKey'].includes(value?.name ?? '')
  );
}

export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly encrypt: boolean;

  constructor(client: S3Client, bucket: string, options: { encrypt?: boolean } = {}) {
    this.client = client;
    this.bucket = bucket;
    this.encrypt = options.encrypt ?? true;
  }

  private object(key: string) {
    return { Bucket: this.bucket, Key: `uploads/${validateKey(key)}` };
  }

  async put(key: string, buffer: Buffer, contentType: string) {
    const object = this.object(key);
    try {
      await this.client.send(
        new PutObjectCommand({
          ...object,
          Body: buffer,
          ContentType: contentType,
          ContentLength: buffer.length,
          IfNoneMatch: '*',
          ...(this.encrypt ? { ServerSideEncryption: 'AES256' as const } : {})
        })
      );
    } catch {
      throw new StorageUnavailable();
    }
  }

  async get(key: string) {
    const object = this.object(key);
    try {
      const result = await this.client.send(new GetObjectCommand(object));
      if (!(result.Body instanceof Readable)) throw new StorageUnavailable();
      return result.Body;
    } catch (error) {
      if (missing(error)) throw new FileNotFound();
      throw new StorageUnavailable();
    }
  }

  async delete(key: string) {
    const object = this.object(key);
    try {
      await this.client.send(new DeleteObjectCommand(object));
    } catch {
      throw new StorageUnavailable();
    }
  }

  async exists(key: string) {
    const object = this.object(key);
    try {
      await this.client.send(new HeadObjectCommand(object));
      return true;
    } catch (error) {
      if (missing(error)) return false;
      throw new StorageUnavailable();
    }
  }

  close() {
    this.client.destroy();
  }
}
