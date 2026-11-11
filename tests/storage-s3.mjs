import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  S3Client,
  CreateBucketCommand,
  DeleteBucketCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3';
import { S3FileStorage } from '../apps/api/src/lib/storage/s3.ts';
import { LocalFileStorage } from '../apps/api/src/lib/storage/local.ts';
import { migrateUploads } from '../apps/api/src/lib/storage/migrate.ts';
import { FileNotFound } from '../apps/api/src/lib/storage/types.ts';
import { storageOrderFlow } from './helpers/storage-flow.mjs';

test('S3 driver against real MinIO: objects, private admin flow, cleanup and checksum migration', async t => {
  const endpoint = new URL(process.env.S3_TEST_ENDPOINT ?? 'http://127.0.0.1:19000');
  assert.ok(
    ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) &&
      endpoint.protocol === 'http:' &&
      !endpoint.username &&
      !endpoint.password &&
      endpoint.pathname === '/' &&
      !endpoint.search &&
      !endpoint.hash,
    'MinIO tests only allow a loopback HTTP endpoint; never AWS.'
  );
  const client = new S3Client({
    endpoint: endpoint.origin,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: { accessKeyId: 'harmea-test', secretAccessKey: 'harmea-minio-test-only' },
    maxAttempts: 1,
    requestHandler: { connectionTimeout: 1500, requestTimeout: 5000 }
  });
  const bucket = `harmea-test-${randomUUID()}`;
  const root = await mkdtemp(join(tmpdir(), 'harmea-minio-migrate-'));
  let created = false;
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    created = true;
    // Standalone MinIO has no KMS. Production driver always requests SSE-S3.
    const storage = new S3FileStorage(client, bucket, { encrypt: false });
    const key = `${randomUUID()}.jpg`;
    const bytes = Buffer.from('S3 fixture bytes');
    await storage.put(key, bytes, 'image/jpeg');
    assert.ok(await storage.exists(key));
    assert.deepEqual(await (await storage.get(key)).toArray().then(Buffer.concat), bytes);
    await assert.rejects(storage.put(key, Buffer.from('replacement'), 'image/jpeg'));
    const anonymous = await fetch(`${endpoint.origin}/${bucket}/uploads/${key}`);
    assert.equal(anonymous.status, 403);
    await storage.delete(key);
    assert.equal(await storage.exists(key), false);
    await assert.rejects(storage.get(key), FileNotFound);
    await storageOrderFlow(t, storage);
    const source = new LocalFileStorage(root);
    await source.put(key, bytes, 'image/jpeg');
    assert.equal((await migrateUploads(source, storage, [key])).copied, 1);
    assert.equal((await migrateUploads(source, storage, [key])).skipped, 1);
    assert.equal(await source.exists(key), true);
  } finally {
    if (created) {
      let token;
      do {
        const page = await client.send(
          new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token })
        );
        if (page.Contents?.length)
          await client.send(
            new DeleteObjectsCommand({
              Bucket: bucket,
              Delete: { Objects: page.Contents.map(({ Key }) => ({ Key })) }
            })
          );
        token = page.NextContinuationToken;
      } while (token);
      await client.send(new DeleteBucketCommand({ Bucket: bucket }));
    }
    client.destroy();
    await rm(root, { recursive: true, force: true });
  }
});
