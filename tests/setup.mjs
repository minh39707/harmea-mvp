import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

const run = promisify(execFile);

test('setup generates local MySQL and lookup secrets without creating admin accounts', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-r1-setup-'));
  try {
    await mkdir(join(root, 'database'));
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(join(root, 'database/001_init.sql'), '-- setup fixture');
    const template = await readFile('.env.example', 'utf8');
    await writeFile(join(root, '.env.example'), template.replace(/\r?\n/g, '\r\n'));
    const script = resolve('scripts/setup.mjs');
    const first = await run(process.execPath, [script], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    const env = await readFile(join(root, '.env'), 'utf8');
    const values = Object.fromEntries(
      env
        .split(/\r?\n/)
        .filter(line => /^[A-Z_]+=/.test(line))
        .map(line => {
          const separator = line.indexOf('=');
          return [line.slice(0, separator), line.slice(separator + 1)];
        })
    );
    assert.ok(!env.includes('REPLACE_WITH_GENERATED_VALUE'));
    assert.ok(Buffer.byteLength(values.LOOKUP_SECRET) >= 32);
    assert.equal(new URL(values.DATABASE_URL).protocol, 'mysql:');
    assert.equal(new URL(values.TEST_DATABASE_URL).protocol, 'mysql:');
    assert.equal(new URL(values.DATABASE_URL).hostname, '127.0.0.1');
    assert.equal(new URL(values.DATABASE_URL).password, values.MYSQL_PASSWORD);
    assert.equal(new URL(values.TEST_DATABASE_URL).password, values.MYSQL_ROOT_PASSWORD);
    assert.notEqual(values.MYSQL_PASSWORD, values.MYSQL_ROOT_PASSWORD);
    assert.equal(values.APP_URL, 'http://localhost:5173');
    assert.equal(values.PORT, '3000');
    assert.equal(values.NODE_ENV, '');
    assert.doesNotMatch(env, /^HOST=/m);
    assert.ok(!/^ADMIN_(?:USERNAME|PASSWORD_HASH)=/m.test(env));
    assert.ok(!first.stdout.includes(values.LOOKUP_SECRET));
    await run(process.execPath, [script], { cwd: root, env: process.env, encoding: 'utf8' });
    assert.equal(await readFile(join(root, '.env'), 'utf8'), env);
    await writeFile(join(root, '.env'), env.replace(/^LOOKUP_SECRET=.*$/m, 'LOOKUP_SECRET='));
    await run(process.execPath, [script], { cwd: root, env: process.env, encoding: 'utf8' });
    const repaired = await readFile(join(root, '.env'), 'utf8');
    assert.ok(Buffer.byteLength(repaired.match(/^LOOKUP_SECRET=(.*)$/m)[1]) >= 32);
    const invalid = repaired.replace(/^LOOKUP_SECRET=.*$/m, 'LOOKUP_SECRET=short');
    await writeFile(join(root, '.env'), invalid);
    await assert.rejects(
      run(process.execPath, [script], { cwd: root, env: process.env, encoding: 'utf8' }),
      error => error.code !== 0 && /shorter than 32 bytes/.test(error.stderr)
    );
    assert.equal(await readFile(join(root, '.env'), 'utf8'), invalid);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('setup migrates old generated listener defaults and preserves database settings', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-setup-upgrade-'));
  const originalSecret = 'a'.repeat(32);
  const databaseUrl = 'mysql://harmea:preserved@127.0.0.1:3306/harmea';
  try {
    await mkdir(join(root, 'database'));
    await writeFile(join(root, 'package.json'), '{}');
    await writeFile(join(root, 'database/001_init.sql'), '-- setup fixture');
    await writeFile(
      join(root, '.env'),
      [
        `DATABASE_URL=${databaseUrl}`,
        'PORT=4000',
        'HOST=127.0.0.1',
        'APP_URL=http://localhost:4000',
        `LOOKUP_SECRET=${originalSecret}`,
        ''
      ].join('\r\n')
    );
    await run(process.execPath, [resolve('scripts/setup.mjs')], {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    });
    const env = await readFile(join(root, '.env'), 'utf8');
    assert.match(env, /^DATABASE_URL=.*$/m);
    assert.equal(env.match(/^DATABASE_URL=(.*)$/m)?.[1], databaseUrl);
    assert.match(env, /^PORT=3000\r?$/m);
    assert.doesNotMatch(env, /^HOST=/m);
    assert.match(env, /^APP_URL=http:\/\/localhost:5173\r?$/m);
    assert.equal(env.match(/^LOOKUP_SECRET=(.*)$/m)?.[1], originalSecret);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
