import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  snapshotMetadata,
  sealSnapshot,
  validateSnapshot,
  validateArchive,
  restoreFiles
} from '../deploy/snapshot.mjs';

const run = promisify(execFile);
const tar = process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/tar.exe' : 'tar';
async function fixture(t, driver = 'local') {
  const root = await mkdtemp(join(tmpdir(), 'harmea-snapshot-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const dir = join(root, 'backup'),
    storage = join(root, 'storage');
  await mkdir(dir);
  await mkdir(storage);
  const env = {
    STORAGE_DRIVER: driver,
    MYSQL_DATABASE: 'harmea_fixture',
    LOOKUP_SECRET: 'snapshot-fixture-lookup-secret-at-least-32-bytes',
    UPLOAD_DIR: join(storage, 'uploads'),
    ...(driver === 's3' ? { S3_BUCKET: 'fixture-bucket', AWS_REGION: 'ap-southeast-1' } : {})
  };
  await writeFile(join(dir, 'manifest.json'), JSON.stringify(snapshotMetadata(env, storage)));
  await writeFile(join(dir, 'db.sql'), 'CREATE TABLE fixture(id INT);\n');
  await writeFile(join(dir, 'INCOMPLETE'), 'incomplete');
  await writeFile(join(storage, 'photo.jpg'), Buffer.from([1, 2, 3, 4]));
  if (driver === 'local')
    await run(tar, ['--force-local', '-cf', join(dir, 'uploads.tar'), '-C', storage, '.']);
  return { root, dir, storage, env };
}

test('local snapshot verifies checksums and restores exact files without stale entries', async t => {
  const { dir, storage, env } = await fixture(t);
  await assert.rejects(validateSnapshot(dir, env, storage, tar), /incomplete/);
  await sealSnapshot(dir, tar);
  assert.equal((await validateSnapshot(dir, env, storage, tar)).storageDriver, 'local');
  const original = await readFile(join(storage, 'photo.jpg'));
  await writeFile(join(storage, 'stale.jpg'), 'stale');
  await writeFile(join(storage, 'photo.jpg'), 'changed');
  await restoreFiles(dir, storage, tar);
  assert.deepEqual(await readFile(join(storage, 'photo.jpg')), original);
  await assert.rejects(readFile(join(storage, 'stale.jpg')));
  const nested = join(storage, 'nested-backup');
  await mkdir(nested);
  await assert.rejects(restoreFiles(nested, storage, tar), /Unsafe storage restore target/);
  assert.deepEqual(await readFile(join(storage, 'photo.jpg')), original);
});

test('snapshot rejects corruption, unsafe checksum names and lookup/storage mismatch before restore', async t => {
  const { dir, storage, env } = await fixture(t);
  await sealSnapshot(dir, tar);
  await assert.rejects(
    validateSnapshot(
      dir,
      { ...env, LOOKUP_SECRET: 'different-snapshot-lookup-secret-32-bytes' },
      storage,
      tar
    ),
    /does not match/
  );
  await assert.rejects(
    validateSnapshot(
      dir,
      { ...env, STORAGE_DRIVER: 's3', S3_BUCKET: 'other-bucket', AWS_REGION: 'ap-southeast-1' },
      storage,
      tar
    ),
    /does not match/
  );
  const sums = await readFile(join(dir, 'SHA256SUMS'), 'utf8');
  await writeFile(join(dir, 'SHA256SUMS'), sums.replace('db.sql', '../db.sql'));
  await assert.rejects(validateSnapshot(dir, env, storage, tar), /checksum/);
  await writeFile(join(dir, 'SHA256SUMS'), sums);
  await writeFile(join(dir, 'db.sql'), 'corrupted');
  await assert.rejects(validateSnapshot(dir, env, storage, tar), /checksum/);
  assert.deepEqual(await readFile(join(storage, 'photo.jpg')), Buffer.from([1, 2, 3, 4]));
});

test('S3 snapshot seals and validates DB-only state without touching AWS', async t => {
  const { dir, storage, env } = await fixture(t, 's3');
  await sealSnapshot(dir, tar);
  const sums = await readFile(join(dir, 'SHA256SUMS'), 'utf8');
  assert.equal(sums.trim().split('\n').length, 2);
  assert.ok(!sums.includes('uploads.tar'));
  assert.equal((await validateSnapshot(dir, env, storage, tar)).storageDriver, 's3');
  await assert.rejects(
    validateSnapshot(dir, { ...env, S3_BUCKET: 'another-bucket' }, storage, tar),
    /does not match/
  );
});

test('unsafe tar paths and hardlinks are rejected', async t => {
  const { dir, storage } = await fixture(t);
  const unsafe = join(dir, 'unsafe.tar');
  await run(tar, ['--force-local', '-cf', unsafe, '--transform=s|^|../|', '-C', storage, '.']);
  await assert.rejects(validateArchive(unsafe, tar));
  await link(join(storage, 'photo.jpg'), join(storage, 'linked.jpg'));
  await run(tar, ['--force-local', '-cf', join(dir, 'linked.tar'), '-C', storage, '.']);
  await assert.rejects(validateArchive(join(dir, 'linked.tar'), tar), /regular files/);
});
