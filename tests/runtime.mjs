import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express from 'express';
import { createApp } from '../apps/api/src/app.ts';
import { configuredAppUrl } from '../apps/api/src/config/app-url.ts';
import { trustSingleReverseProxy } from '../apps/api/src/middleware/trust-proxy.ts';

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}

async function waitForExit(child, timeoutMs = 12000) {
  let timer;
  try {
    return await Promise.race([
      new Promise(resolve => child.once('exit', (code, signal) => resolve({ code, signal }))),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('API child process did not exit before the deadline.')),
          timeoutMs
        );
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function startApiChild(t) {
  const port = await freePort();
  const storage = await mkdtemp(join(tmpdir(), 'harmea-runtime-'));
  const child = spawn(process.execPath, ['--env-file-if-exists=.env', 'apps/api/src/server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(port),
      HOST: '127.0.0.1',
      APP_URL: 'http://localhost:5173',
      DATABASE_URL: 'mysql://harmea:unavailable@127.0.0.1:1/harmea',
      UPLOAD_DIR: join(storage, 'uploads'),
      DB_CONNECTION_LIMIT: '1'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  let started = false;
  let resolveStarted;
  let rejectStarted;
  const startedPromise = new Promise((resolve, reject) => {
    resolveStarted = resolve;
    rejectStarted = reject;
  });
  const timer = setTimeout(
    () => rejectStarted(new Error(`API child did not start. stderr=${stderr}`)),
    10000
  );
  child.stdout.on('data', chunk => {
    stdout += chunk;
    for (const line of stdout.split(/\r?\n/)) {
      try {
        if (JSON.parse(line).event === 'server_started') started = true;
      } catch {
        continue;
      }
    }
    if (started) resolveStarted();
  });
  child.stderr.on('data', chunk => {
    stderr += chunk;
  });
  child.once('error', rejectStarted);
  child.once('exit', (code, signal) => {
    if (!started) rejectStarted(new Error(`API child exited early (${code ?? signal}). ${stderr}`));
  });
  try {
    await startedPromise;
  } finally {
    clearTimeout(timer);
  }
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    if (child.exitCode === null && child.signalCode === null)
      await waitForExit(child).catch(() => undefined);
    await rm(storage, { recursive: true, force: true });
  });
  return {
    child,
    base: `http://127.0.0.1:${port}`,
    stdout: () => stdout,
    stderr: () => stderr
  };
}

test('APP_URL takes priority and APP_ORIGIN fallback warns once without printing its value', () => {
  const previousUrl = process.env.APP_URL;
  const previousOrigin = process.env.APP_ORIGIN;
  const warnings = [];
  const write = process.stderr.write;
  try {
    process.env.APP_URL = 'https://current.example.test';
    process.env.APP_ORIGIN = 'https://legacy-secret.example.test';
    assert.equal(configuredAppUrl(), 'https://current.example.test');
    delete process.env.APP_URL;
    process.stderr.write = chunk => {
      warnings.push(String(chunk));
      return true;
    };
    assert.equal(configuredAppUrl(), 'https://legacy-secret.example.test');
    assert.equal(configuredAppUrl(), 'https://legacy-secret.example.test');
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /APP_ORIGIN_DEPRECATED/);
    assert.doesNotMatch(warnings[0], /legacy-secret/);
  } finally {
    process.stderr.write = write;
    if (previousUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousUrl;
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
  }
});

test('one trusted reverse proxy supplies client IP and HTTPS protocol', async t => {
  const app = express();
  trustSingleReverseProxy(app);
  app.get('/proxy-check', (request, response) => {
    response.json({ ip: request.ip, secure: request.secure });
  });
  const server = app.listen(0, '127.0.0.1');
  t.after(() => new Promise(resolve => server.close(resolve)));
  await new Promise(resolve => server.once('listening', resolve));
  assert.equal(app.get('trust proxy'), 1);
  const response = await fetch(`http://127.0.0.1:${server.address().port}/proxy-check`, {
    headers: {
      'X-Forwarded-For': '203.0.113.9',
      'X-Forwarded-Proto': 'https'
    }
  });
  assert.deepEqual(await response.json(), { ip: '203.0.113.9', secure: true });
});

test('production mutation Origin allowlist contains only APP_URL origin', async t => {
  const previousEnv = process.env.NODE_ENV;
  const previousUrl = process.env.APP_URL;
  const previousOrigin = process.env.APP_ORIGIN;
  const previousAdmin = process.env.ADMIN_ENABLED;
  process.env.NODE_ENV = 'production';
  process.env.APP_URL = 'https://harmea.example.test';
  process.env.APP_ORIGIN = 'http://localhost:5173';
  delete process.env.ADMIN_ENABLED;
  const server = createApp().listen(0, '127.0.0.1');
  t.after(async () => {
    await new Promise(resolve => server.close(resolve));
    if (previousEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousEnv;
    if (previousUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousUrl;
    if (previousOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousOrigin;
    if (previousAdmin === undefined) delete process.env.ADMIN_ENABLED;
    else process.env.ADMIN_ENABLED = previousAdmin;
  });
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const denied = await fetch(`${base}/api/health`, {
    method: 'POST',
    headers: { Origin: 'http://localhost:5173' }
  });
  assert.equal(denied.status, 403);
  const allowed = await fetch(`${base}/api/health`, {
    method: 'POST',
    headers: { Origin: 'https://harmea.example.test' }
  });
  assert.equal(allowed.status, 404);
});

test('server starts without a database; health stays live and DB-dependent routes return 503', async t => {
  const api = await startApiChild(t);
  const health = await fetch(`${api.base}/health?probe=do-not-log`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: 'ok' });
  assert.equal(health.headers.get('set-cookie'), null);

  const apiHealth = await fetch(`${api.base}/api/health`);
  assert.equal(apiHealth.status, 200);
  assert.equal(apiHealth.headers.get('set-cookie'), null);

  const ready = await fetch(`${api.base}/ready`);
  assert.equal(ready.status, 503);
  assert.deepEqual(await ready.json(), { status: 'not_ready' });
  assert.equal(ready.headers.get('set-cookie'), null);

  const databaseRequest = await fetch(`${api.base}/api/products/current`);
  assert.equal(databaseRequest.status, 503);
  assert.deepEqual(await databaseRequest.json(), {
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Dịch vụ tạm thời chưa sẵn sàng. Vui lòng thử lại sau.'
    }
  });
  assert.equal(databaseRequest.headers.get('set-cookie'), null);
  await new Promise(resolve => setTimeout(resolve, 30));

  const requestLog = api
    .stdout()
    .split(/\r?\n/)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .find(entry => entry?.method === 'GET' && entry.path === '/health');
  assert.equal(requestLog?.method, 'GET');
  assert.equal(requestLog?.path, '/health');
  assert.equal(requestLog?.status, 200);
  assert.ok(Number.isInteger(requestLog.duration_ms));
  assert.doesNotMatch(api.stdout(), /probe=do-not-log/);
  assert.match(api.stderr(), /DATABASE_UNAVAILABLE/);
});

test(
  'SIGTERM drains requests and closes the database pool within ten seconds',
  {
    skip:
      process.platform === 'win32' ? 'Windows cannot deliver a catchable SIGTERM to Node.' : false
  },
  async t => {
    const api = await startApiChild(t);
    const startedAt = Date.now();
    api.child.kill('SIGTERM');
    const result = await waitForExit(api.child, 11000);
    assert.ok(Date.now() - startedAt < 10000);
    assert.equal(result.code, 0);
    assert.match(api.stdout(), /"event":"server_stopped"/);
  }
);
