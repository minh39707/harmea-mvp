import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, scryptSync, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createApp } from '../apps/api/src/app.ts';
import { checkoutAttempt } from '../apps/web/src/features/checkout/attempt.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';
import {
  adminSession,
  loginAdmin,
  logoutAdmin,
  adminOrders,
  adminOrder,
  changeStatus,
  privateAsset,
  AdminInputError
} from '../apps/web/src/features/admin/client.ts';
import { adminRoute } from '../apps/web/src/features/admin/route.ts';
import { api, ApiError } from '../apps/web/src/shared/api.ts';

const digest = b => createHash('sha256').update(b).digest('hex');
const draft = (status, extra = {}) => ({
  status,
  reason: '',
  trackingCode: '',
  confirmed: true,
  ...extra
});
test('admin frontend client with real HTTP, database and private files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-admin-d-'));
  Object.assign(process.env, {
    DB_DRIVER: 'pglite',
    DATA_DIR: join(root, 'db'),
    UPLOAD_DIR: join(root, 'uploads'),
    APP_ORIGIN: 'http://localhost:5173',
    ADMIN_USERNAME: 'qa-admin'
  });
  const password = randomBytes(24).toString('base64url'),
    salt = randomBytes(16).toString('hex');
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  let db = await openDatabase();
  for (const file of (await readdir('database')).filter(f => /^\d+.*\.sql$/.test(f)).sort())
    await db.exec(await readFile(join('database', file), 'utf8'));
  const nativeFetch = globalThis.fetch;
  let server,
    base,
    cookie = '',
    dropLogout = false,
    requests = [];
  const start = async () => {
    server = createApp(db, 'qa-admin-isolated').listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (server) {
      await new Promise(r => server.close(r));
      server = null;
    }
  };
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input), base),
      headers = new Headers(init.headers);
    if (cookie && url.pathname.startsWith('/api/admin/')) headers.set('Cookie', cookie);
    requests.push({ path: url.pathname, method: init.method ?? 'GET' });
    const response = await nativeFetch(url, { ...init, headers });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    if (dropLogout && init.method === 'DELETE') {
      await response.arrayBuffer();
      throw TypeError('Dropped committed logout response');
    }
    return response;
  };
  const unauthorized = e => e instanceof ApiError && e.status === 401;
  const photo = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#8facb8' }
  })
    .jpeg()
    .toBuffer();
  const design = {
    ...blankDesign,
    fullName: 'Nguyễn Minh — thử quản trị',
    musicUrl: 'https://open.spotify.com/track/qa-placeholder',
    photo: 'data:image/jpeg;base64,' + photo.toString('base64'),
    photoWidth: 120,
    photoHeight: 80,
    crop: centerCrop(120, 80),
    dateOfBirth: '2003-01-15'
  };
  const png = await sharp(Buffer.from(cardSvg(design)))
    .png()
    .toBuffer();
  const prepared = {
    payload: {
      productId: '11111111-1111-4111-8111-111111111111',
      templateVersion: 'harmea-card-v1',
      quantity: 2,
      design: orderDesign(design)
    },
    photo: new Blob([photo], { type: 'image/jpeg' }),
    preview: new Blob([png], { type: 'image/png' })
  };
  const map = new Map(),
    storage = {
      getItem: k => map.get(k) ?? null,
      setItem: (k, v) => map.set(k, v),
      removeItem: k => map.delete(k)
    };
  const create = () =>
    checkoutAttempt(storage).submit(
      [prepared, { ...prepared, payload: { ...prepared.payload, quantity: 1 } }],
      {
        name: 'Người nhận thử',
        phone: '0900000000',
        address: 'Địa chỉ hư cấu',
        note: 'Không giao hàng thật'
      },
      true
    );
  let receipt, order, asset, oldCookie;
  try {
    await start();
    await t.test(
      'public admin shells contain no order data; APIs remain authenticated',
      async () => {
        for (const path of [
          '/admin',
          '/admin/login',
          '/admin/orders',
          '/admin/orders/11111111-1111-4111-8111-111111111111'
        ]) {
          const r = await fetch(path);
          assert.equal(r.status, 200);
          assert.match(r.headers.get('content-type'), /text\/html/);
          assert.ok(!(await r.text()).includes(design.fullName));
        }
        assert.equal((await fetch('/api/admin/unknown')).status, 401);
        assert.equal((await fetch('/unknown-page')).status, 404);
        await assert.rejects(adminSession(), unauthorized);
        await assert.rejects(adminOrders(1, ''), unauthorized);
        assert.equal(adminRoute('/admin/orders/not-a-uuid').kind, 'missing');
      }
    );
    await t.test(
      'C checkout appears in D with B snapshots and exact original/PNG bytes',
      async () => {
        receipt = (await create()).receipt;
        await assert.rejects(loginAdmin('qa-admin', 'wrong-password'), unauthorized);
        assert.equal((await loginAdmin('qa-admin', password)).authenticated, true);
        const page = await adminOrders(1, 'pending');
        assert.equal(page.total, 1);
        assert.equal(page.items[0].id, receipt.id);
        order = await adminOrder(receipt.id);
        assert.equal(order.items.length, 2);
        assert.equal(order.quantity, 3);
        assert.equal(order.items[0].designSnapshot.fullName, design.fullName);
        assert.deepEqual(order.items[0].designSnapshot.crop, prepared.payload.design.crop);
        const item = order.items[0];
        asset = item.assets.photo;
        for (const [kind, bytes] of [
          ['photo', photo],
          ['preview', png]
        ])
          assert.equal(
            digest(
              Buffer.from(
                await (await privateAsset(order.id, item.id, kind, item.assets[kind])).arrayBuffer()
              )
            ),
            digest(bytes)
          );
        const before = requests.length;
        await assert.rejects(
          privateAsset(order.id, item.id, 'photo', 'https://evil.example/asset')
        );
        assert.equal(requests.length, before);
      }
    );
    await t.test('confirmation and cancellation validation prevent client mutation', async () => {
      const before = requests.length;
      for (const input of [
        draft('confirmed', { confirmed: false }),
        draft('completed'),
        draft('cancelled')
      ])
        await assert.rejects(changeStatus(order, input), AdminInputError);
      assert.equal(requests.length, before);
      const r = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: 1, status: 'completed' })
      });
      assert.equal(r.status, 409);
      assert.equal((await adminOrder(order.id)).history.length, 1);
    });
    await t.test('stale version sends one PATCH then one GET, never retries mutation', async () => {
      const stale = structuredClone(order);
      order = (await changeStatus(order, draft('confirmed'))).order;
      const before = requests.length,
        result = await changeStatus(stale, draft('confirmed'));
      assert.equal(result.kind, 'conflict');
      assert.equal(result.order.version, 2);
      assert.equal(result.order.history.length, 2);
      assert.deepEqual(
        requests.slice(before).map(r => r.method),
        ['PATCH', 'GET']
      );
      order = (await changeStatus(result.order, draft('producing'))).order;
      order = (await changeStatus(order, draft('shipping', { trackingCode: 'DEMO-ONLY' }))).order;
      order = (await changeStatus(order, draft('completed'))).order;
      assert.equal(order.history.length, 5);
      const tracking = await api('/tracking/lookup', { token: receipt.trackingToken });
      assert.equal(tracking.status, 'completed');
      assert.equal(tracking.trackingCode, 'DEMO-ONLY');
      for (const key of ['recipient', 'items', 'cancellationReason', 'note'])
        assert.ok(!(key in tracking));
    });
    await t.test('cancellation is private and terminal', async () => {
      const r = (await create()).receipt;
      const cancelled = (
        await changeStatus(
          await adminOrder(r.id),
          draft('cancelled', { reason: 'Lý do nội bộ thử nghiệm' })
        )
      ).order;
      assert.equal(cancelled.status, 'cancelled');
      assert.equal(cancelled.history.length, 2);
      await assert.rejects(changeStatus(cancelled, draft('confirmed')), AdminInputError);
      assert.ok(
        !JSON.stringify(await api('/tracking/lookup', { token: r.trackingToken })).includes(
          'Lý do nội bộ'
        )
      );
    });
    await t.test('restart preserves orders, history and private assets', async () => {
      await stop();
      await db.close();
      db = await openDatabase();
      await start();
      await loginAdmin('qa-admin', password);
      order = await adminOrder(receipt.id);
      assert.equal(order.status, 'completed');
      assert.equal(order.history.length, 5);
      assert.equal(
        digest(
          Buffer.from(
            await (await privateAsset(order.id, order.items[0].id, 'photo', asset)).arrayBuffer()
          )
        ),
        digest(photo)
      );
    });
    await t.test('logout revokes replayed cookie for data and files', async () => {
      oldCookie = cookie;
      await logoutAdmin();
      cookie = oldCookie;
      await assert.rejects(adminOrder(order.id), unauthorized);
      await assert.rejects(privateAsset(order.id, order.items[0].id, 'photo', asset), unauthorized);
      await assert.rejects(adminSession(), unauthorized);
      cookie = '';
    });
    await t.test(
      'expired session rejected server-side and lost logout response reports error',
      async () => {
        await loginAdmin('qa-admin', password);
        await db.query(
          "UPDATE admin_sessions SET created_at=CURRENT_TIMESTAMP - INTERVAL '2 seconds', expires_at=CURRENT_TIMESTAMP - INTERVAL '1 second'"
        );
        await assert.rejects(adminSession(), unauthorized);
        await loginAdmin('qa-admin', password);
        dropLogout = true;
        await assert.rejects(logoutAdmin(), e => e instanceof ApiError && e.status === 0);
        dropLogout = false;
        await assert.rejects(adminSession(), unauthorized);
      }
    );
  } finally {
    globalThis.fetch = nativeFetch;
    await stop();
    await db.close();
  }
});

test('demo fixture command creates completed/cancelled once in an isolated database', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-demo-d-'));
  const env = {
    ...process.env,
    DB_DRIVER: 'pglite',
    DATA_DIR: join(root, 'db'),
    UPLOAD_DIR: join(root, 'uploads'),
    DEMO_LINKS_FILE: join(root, 'private', 'links.json')
  };
  const run = promisify(execFile);
  await run(process.execPath, ['scripts/migrate.ts'], { env });
  const first = await run(process.execPath, ['scripts/seed-demo.mjs'], { env });
  const links = JSON.parse(await readFile(env.DEMO_LINKS_FILE, 'utf8'));
  assert.equal(Object.keys(links).length, 2);
  for (const value of Object.values(links)) {
    assert.match(value.path, /^\/track#[A-Za-z0-9_-]{43}$/);
    assert.ok(!first.stdout.includes(value.path));
  }
  await run(process.execPath, ['scripts/seed-demo.mjs'], { env });
  const saved = { ...process.env };
  Object.assign(process.env, env);
  const db = await openDatabase();
  try {
    const rows = (await db.query('SELECT status,version FROM orders ORDER BY status')).rows;
    assert.deepEqual(
      rows.map(r => r.status),
      ['cancelled', 'completed']
    );
    assert.deepEqual(
      rows.map(r => r.version),
      [2, 5]
    );
    assert.equal(
      Number((await db.query('SELECT count(*)::int AS n FROM order_status_events')).rows[0].n),
      7
    );
  } finally {
    await db.close();
    process.env = saved;
  }
});
