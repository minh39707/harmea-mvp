import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { LocalFileStorage } from '../apps/api/src/lib/storage/local.ts';
import { S3FileStorage } from '../apps/api/src/lib/storage/s3.ts';
import { FileNotFound, StorageUnavailable } from '../apps/api/src/lib/storage/types.ts';
import { createFileStorage, checkFileStorage } from '../apps/api/src/lib/storage/index.ts';
import { migrateUploads } from '../apps/api/src/lib/storage/migrate.ts';
import { storageOrderFlow } from './helpers/storage-flow.mjs';

test('local driver preserves bytes, immutable keys, and rejects path traversal', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-storage-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const storage = new LocalFileStorage(root);
  const bytes = Buffer.from('fixture bytes');
  await storage.put('fixture.jpg', bytes, 'image/jpeg');
  assert.deepEqual(await (await storage.get('fixture.jpg')).toArray().then(Buffer.concat), bytes);
  assert.ok(await storage.exists('fixture.jpg'));
  await assert.rejects(
    storage.put('fixture.jpg', Buffer.from('replacement'), 'image/jpeg'),
    StorageUnavailable
  );
  assert.deepEqual(await (await storage.get('fixture.jpg')).toArray().then(Buffer.concat), bytes);
  for (const key of ['../outside.jpg', '/absolute', 'a/b', 'a\\b', '..', '.', '']) {
    await assert.rejects(storage.get(key), /Invalid storage key/);
    await assert.rejects(storage.put(key, bytes, 'image/jpeg'), /Invalid storage key/);
    await assert.rejects(storage.delete(key), /Invalid storage key/);
    await assert.rejects(storage.exists(key), /Invalid storage key/);
  }
  await storage.delete('fixture.jpg');
  await storage.delete('fixture.jpg');
  assert.equal(await storage.exists('fixture.jpg'), false);
  await assert.rejects(storage.get('fixture.jpg'), FileNotFound);
  await checkFileStorage(storage);
});

test('S3 boundary requests SSE-S3 and immutable writes; missing files differ from denied access', async () => {
  let command;
  let failure;
  const storage = new S3FileStorage(
    {
      send: async value => {
        command = value;
        if (failure) throw failure;
        return { Body: Readable.from('fixture') };
      }
    },
    'fixture-bucket'
  );
  await storage.put('fixture.jpg', Buffer.from('fixture'), 'image/jpeg');
  assert.equal(command.input.Key, 'uploads/fixture.jpg');
  assert.equal(command.input.ServerSideEncryption, 'AES256');
  assert.equal(command.input.IfNoneMatch, '*');
  assert.equal(command.input.ACL, undefined);
  failure = { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } };
  assert.equal(await storage.exists('missing.jpg'), false);
  await assert.rejects(storage.get('missing.jpg'), FileNotFound);
  failure = { name: 'AccessDenied', $metadata: { httpStatusCode: 403 } };
  await assert.rejects(storage.exists('denied.jpg'), StorageUnavailable);
  await assert.rejects(storage.get('denied.jpg'), StorageUnavailable);
  assert.throws(() => createFileStorage({ STORAGE_DRIVER: 'invalid' }), /STORAGE_DRIVER/);
  assert.throws(() => createFileStorage({ STORAGE_DRIVER: 's3' }), /S3_BUCKET/);
  assert.throws(
    () =>
      createFileStorage({
        STORAGE_DRIVER: 's3',
        S3_BUCKET: 'fixture',
        AWS_REGION: 'ap-southeast-1',
        AWS_ACCESS_KEY_ID: 'must-not-be-used'
      }),
    /instance role/
  );
});

test('migration dry-run, verified copy, safe resume and checksum mismatch retain local files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-storage-migrate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = new LocalFileStorage(join(root, 'source'));
  const destination = new LocalFileStorage(join(root, 'destination'));
  const key = `${randomUUID()}.jpg`;
  await source.put(key, Buffer.from('fixture'), 'image/jpeg');
  assert.deepEqual(await migrateUploads(source, undefined, [key]), {
    checked: 1,
    copied: 0,
    skipped: 0,
    dryRun: true
  });
  assert.equal(await destination.exists(key), false);
  assert.deepEqual(await migrateUploads(source, destination, [key]), {
    checked: 1,
    copied: 1,
    skipped: 0,
    dryRun: false
  });
  assert.deepEqual(await migrateUploads(source, destination, [key]), {
    checked: 1,
    copied: 0,
    skipped: 1,
    dryRun: false
  });
  await writeFile(join(root, 'destination', key), 'different');
  await assert.rejects(migrateUploads(source, destination, [key]), /checksum/);
  assert.equal(await source.exists(key), true);
});

test('local storage order lifecycle and failed-order cleanup on real MySQL', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-storage-orders-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await storageOrderFlow(t, new LocalFileStorage(root));
});
