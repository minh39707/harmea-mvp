import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, stat, symlink, link, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const run = promisify(execFile);
const script = resolve('scripts/make-prod-env.mjs');
const invoke = (...args) =>
  run(process.execPath, [script, ...args], { cwd: process.cwd(), encoding: 'utf8' });
const values = text =>
  Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter(line => /^[A-Z_][A-Z0-9_]*=/.test(line))
      .map(line => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );

test('production env contains template values, random matching credentials and no console secrets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-prod-env-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 'private.env');
  const command = await invoke('--out', output, '--image', 'example-user/harmea-web:v1');
  const text = await readFile(output, 'utf8'),
    env = values(text),
    template = values(await readFile('.env.example', 'utf8'));
  for (const key of Object.keys(template)) assert.ok(key in env, key);
  assert.ok(!text.includes('CHANGE_ME'));
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.PORT, '3000');
  assert.equal(env.APP_URL, 'https://harmea.introd.xyz');
  assert.equal(env.ADMIN_ENABLED, 'false');
  assert.equal(env.STORAGE_DRIVER, 'local');
  assert.equal(env.APP_IMAGE, 'example-user/harmea-web:v1');
  const url = new URL(env.DATABASE_URL);
  assert.equal(url.hostname, 'db');
  assert.equal(decodeURIComponent(url.password), env.MYSQL_PASSWORD);
  assert.equal(decodeURIComponent(url.username), env.MYSQL_USER);
  assert.equal(url.pathname, `/${env.MYSQL_DATABASE}`);
  for (const key of ['MYSQL_PASSWORD', 'MYSQL_ROOT_PASSWORD', 'LOOKUP_SECRET']) {
    assert.match(env[key], /^[a-f0-9]{64}$/);
    assert.ok(!(command.stdout + command.stderr).includes(env[key]));
  }
  assert.equal(new Set([env.MYSQL_PASSWORD, env.MYSQL_ROOT_PASSWORD, env.LOOKUP_SECRET]).size, 3);
  if (process.platform !== 'win32') assert.equal((await stat(output)).mode & 0o777, 0o600);
  const next = join(root, 'second.env');
  await invoke('--out', next);
  assert.notEqual(values(await readFile(next, 'utf8')).LOOKUP_SECRET, env.LOOKUP_SECRET);
});

test('production env refuses repository targets, junction aliases and overwrite without force', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-prod-env-path-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await assert.rejects(invoke('--out', resolve('.env.g3-never-written')), error =>
    /outside the repository/.test(error.stderr)
  );
  await assert.rejects(access(resolve('.env.g3-never-written')));
  const alias = join(root, 'repo-alias');
  await symlink(process.cwd(), alias, process.platform === 'win32' ? 'junction' : 'dir');
  await assert.rejects(invoke('--out', join(alias, '.env.g3-never-written')), error =>
    /outside the repository/.test(error.stderr)
  );
  const output = join(root, 'existing.env');
  await writeFile(output, 'sentinel');
  await assert.rejects(invoke('--out', output), error => /Output exists/.test(error.stderr));
  assert.equal(await readFile(output, 'utf8'), 'sentinel');
  await invoke('--out', output, '--force');
  assert.equal(values(await readFile(output, 'utf8')).NODE_ENV, 'production');
});

test('production env refuses hardlinked output even with force', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-prod-env-link-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source'),
    target = join(root, 'linked.env');
  await writeFile(source, 'sentinel');
  await link(source, target);
  await assert.rejects(invoke('--out', target, '--force'), error => /hardlink/.test(error.stderr));
  assert.equal(await readFile(source, 'utf8'), 'sentinel');
});

test('S3 production config is explicit and never creates AWS access keys', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-prod-env-s3-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = join(root, 's3.env');
  await assert.rejects(invoke('--out', output, '--s3-bucket', 'fixture-bucket'), error =>
    /together/.test(error.stderr)
  );
  await assert.rejects(invoke('--out', output, '--image', 'example-user/harmea-web:latest'));
  await invoke('--out', output, '--s3-bucket', 'fixture-bucket', '--aws-region', 'ap-southeast-1');
  const env = values(await readFile(output, 'utf8'));
  assert.equal(env.STORAGE_DRIVER, 's3');
  assert.equal(env.S3_BUCKET, 'fixture-bucket');
  assert.equal(env.AWS_REGION, 'ap-southeast-1');
  for (const key of [
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_SESSION_TOKEN',
    'S3_ENDPOINT'
  ])
    assert.ok(!(key in env));
});
