import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import type { FileStorage } from './types.ts';
import { LocalFileStorage } from './local.ts';
import { S3FileStorage } from './s3.ts';

export function createFileStorage(env: NodeJS.ProcessEnv = process.env): FileStorage {
  const driver = env.STORAGE_DRIVER || 'local';
  if (driver === 'local') return new LocalFileStorage(env.UPLOAD_DIR ?? 'storage/uploads');
  if (driver !== 's3') throw new Error('STORAGE_DRIVER must be local or s3.');
  if (!env.S3_BUCKET || !env.AWS_REGION || env.S3_BUCKET === 'CHANGE_ME')
    throw new Error('S3_BUCKET and AWS_REGION are required for S3 storage.');
  if (env.S3_ENDPOINT || env.AWS_ENDPOINT_URL || env.AWS_ENDPOINT_URL_S3)
    throw new Error('Custom S3 endpoints are supported only by the isolated test harness.');
  if (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY || env.AWS_SESSION_TOKEN)
    throw new Error('Use the instance role for S3; do not configure static AWS credentials.');
  return new S3FileStorage(
    new S3Client({
      region: env.AWS_REGION,
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 }
    }),
    env.S3_BUCKET
  );
}

export async function checkFileStorage(storage: FileStorage) {
  const key = `ready-${randomUUID()}.tmp`;
  await storage.put(key, Buffer.from('ready'), 'application/octet-stream');
  await storage.delete(key);
}
