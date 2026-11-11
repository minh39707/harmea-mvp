import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../apps/api/src/app.ts';
import { openDatabase } from '../apps/api/src/db.ts';
import { LocalFileStorage } from '../apps/api/src/lib/storage/local.ts';
import { createTestDatabase } from './helpers/db.mjs';

test('Docker acceptance fixture runs create/verify/gate against real MySQL and local storage', async t => {
  const isolated = await createTestDatabase(t);
  const root = await mkdtemp(join(tmpdir(), 'harmea-docker-fixture-'));
  const keys = ['NODE_ENV', 'APP_URL', 'LOOKUP_SECRET', 'ADMIN_ENABLED'];
  const before = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  Object.assign(process.env, {
    NODE_ENV: 'production',
    APP_URL: 'http://127.0.0.1:3000',
    LOOKUP_SECRET: 'docker-fixture-test-secret-at-least-32-bytes',
    ADMIN_ENABLED: 'true'
  });
  const storage = new LocalFileStorage(join(root, 'uploads'));
  let db = await openDatabase();
  let server;
  let base;
  const start = async () => {
    server = createApp(db, { storage }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = () => new Promise(resolve => server.close(resolve));
  const fixture = async mode => {
    const result = await promisify(execFile)(
      process.execPath,
      ['scripts/docker-fixture.mjs', mode],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HARMEA_DOCKER_SMOKE: 'true',
          DOCKER_SMOKE_BASE_URL: base,
          DOCKER_SMOKE_RECORD_PATH: join(root, 'record.json')
        }
      }
    );
    assert.match(result.stdout, /Docker fixture .*: PASS\./);
  };
  try {
    await start();
    await fixture('create');
    await stop();
    await db.close();
    db = await openDatabase();
    await start();
    await fixture('verify');
    await stop();
    process.env.ADMIN_ENABLED = 'false';
    await start();
    await fixture('gate');
  } finally {
    if (server?.listening) await stop();
    await db.close();
    await isolated.destroy();
    await rm(root, { recursive: true, force: true });
    for (const key of keys)
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
  }
});
