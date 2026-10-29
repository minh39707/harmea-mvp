import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes, scryptSync, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { request as httpRequest } from 'node:http';
import sharp from 'sharp';
import { createApp } from '../apps/api/src/app.ts';
import { openDatabase } from '../apps/api/src/db.ts';

const contract = JSON.parse(await readFile('contracts/openapi.json', 'utf8'));
// Check responses against the actual contract, including allowlists, not a mock API.
function schema(value, definition) {
  const s = definition.$ref
    ? contract.components.schemas[definition.$ref.split('/').at(-1)]
    : definition;
  if (s.const !== undefined) assert.equal(value, s.const);
  if (s.enum) assert.ok(s.enum.includes(value));
  if (s.type) {
    const types = Array.isArray(s.type) ? s.type : [s.type];
    assert.ok(
      types.includes(value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value) ||
        (types.includes('integer') && Number.isInteger(value))
    );
  }
  if (value === null) return;
  if (s.type === 'object') {
    for (const key of s.required ?? []) assert.ok(key in value, `Missing contract field ${key}`);
    if (s.additionalProperties === false)
      for (const key of Object.keys(value))
        assert.ok(key in s.properties, `Extra contract field ${key}`);
    for (const [key, child] of Object.entries(s.properties ?? {}))
      if (key in value) schema(value[key], child);
  }
  if (Array.isArray(value)) {
    if (s.minItems) assert.ok(value.length >= s.minItems);
    if (s.maxItems) assert.ok(value.length <= s.maxItems);
    for (const child of value) schema(child, s.items);
  }
  if (typeof value === 'string') {
    if (s.pattern) assert.match(value, new RegExp(s.pattern));
    if (s.minLength) assert.ok(value.length >= s.minLength);
    if (s.maxLength) assert.ok(value.length <= s.maxLength);
    if (s.format === 'date-time') assert.ok(Number.isFinite(Date.parse(value)));
  }
  if (typeof value === 'number') {
    if (s.minimum !== undefined) assert.ok(value >= s.minimum);
    if (s.maximum !== undefined) assert.ok(value <= s.maximum);
    if (s.type === 'integer') assert.ok(Number.isInteger(value));
  }
}
const namedSchema = (value, name) => schema(value, { $ref: `#/components/schemas/${name}` });
const digest = s => createHash('sha256').update(s).digest('hex');

test('canonical cart orders, admin sessions, assets and state transitions', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-task-a-'));
  process.env.DB_DRIVER = 'pglite';
  process.env.DATA_DIR = join(root, 'db');
  process.env.UPLOAD_DIR = join(root, 'uploads');
  process.env.ADMIN_USERNAME = 'qa-admin';
  process.env.APP_ORIGIN = 'http://localhost:5173';
  const password = randomBytes(24).toString('base64url'),
    salt = randomBytes(16).toString('hex');
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const first = execFileSync(process.execPath, ['scripts/migrate.ts'], {
    env: process.env,
    encoding: 'utf8'
  });
  const second = execFileSync(process.execPath, ['scripts/migrate.ts'], {
    env: process.env,
    encoding: 'utf8'
  });
  assert.match(first, /Applied: 004_order_items.sql/);
  assert.match(second, /Already applied: 004_order_items.sql/);
  let db = await openDatabase(),
    server,
    base,
    cookie;
  const secret = randomBytes(32).toString('hex');
  const start = async () => {
    server = createApp(db, secret).listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (server) {
      await new Promise(r => server.close(r));
      server = null;
    }
  };
  const call = async (
    path,
    { body, method = body === undefined ? 'GET' : 'POST', session = false, headers = {} } = {}
  ) => {
    const multipart = body instanceof FormData;
    const r = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined || multipart ? {} : { 'Content-Type': 'application/json' }),
        ...(session && cookie ? { Cookie: cookie } : {}),
        ...headers
      },
      ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) })
    });
    const bytes = Buffer.from(await r.arrayBuffer());
    let data;
    try {
      data = JSON.parse(bytes.toString());
    } catch {
      data = null;
    }
    return { status: r.status, data, headers: r.headers, bytes };
  };
  const expect = (r, status) => {
    assert.equal(r.status, status, r.data?.error?.code ?? 'Unexpected status');
    if (r.status >= 400) namedSchema(r.data, 'Error');
    return r.data;
  };
  const check = async (name, run) =>
    t.test(name, async () => {
      await stop();
      await start();
      await run();
    });
  const png = await sharp({ create: { width: 60, height: 90, channels: 3, background: '#abc' } })
    .png()
    .toBuffer();
  const photo = await sharp(png).jpeg().toBuffer();
  const design = {
    fullName: 'QA Tiếng Việt',
    musicUrl: 'https://open.spotify.com/track/qa',
    dateOfBirth: '2003-01-01',
    commemorativeDate: '2026-10-29',
    place: 'Địa điểm giả',
    signatureText: 'QA',
    color: 'blue',
    crop: { x: 0, y: 0, width: 1, height: 1 }
  };
  const productId = '11111111-1111-4111-8111-111111111111';
  const payload = () => ({
    requestKey: randomUUID(),
    designConfirmed: true,
    items: [
      {
        productId,
        templateVersion: 'harmea-card-v1',
        quantity: 2,
        design: structuredClone(design)
      },
      {
        productId,
        templateVersion: 'harmea-card-v1',
        quantity: 1,
        design: { ...structuredClone(design), fullName: 'Thiết kế thứ hai' }
      }
    ],
    recipient: { name: 'QA giả lập', phone: '0900000000', address: 'Địa chỉ giả dùng kiểm thử' },
    note: 'Nội bộ không công khai'
  });
  const form = (b, changes = {}) => {
    const f = new FormData();
    f.set('payload', JSON.stringify(b));
    b.items.forEach((_, i) => {
      f.set(`photo_${i}`, new Blob([photo], { type: 'image/jpeg' }), 'ignored-name.jpg');
      f.set(`preview_${i}`, new Blob([png], { type: 'image/png' }), 'ignored-preview.png');
    });
    for (const [key, value] of Object.entries(changes))
      value === null ? f.delete(key) : f.set(key, value);
    return f;
  };
  const files = async () => {
    try {
      return await readdir(process.env.UPLOAD_DIR);
    } catch {
      return [];
    }
  };
  const count = async table =>
    (await db.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n;
  const login = async () => {
    const r = await call('/api/admin/session', {
      session: true,
      body: { username: 'qa-admin', password }
    });
    expect(r, 200);
    namedSchema(r.data, 'AdminSession');
    cookie = r.headers.get('set-cookie').split(';')[0];
    return r;
  };
  let created, submitted, detail;
  try {
    await check('catalog matches canonical Product schema', async () => {
      const r = await call('/api/products/current');
      expect(r, 200);
      namedSchema(r.data, 'Product');
      assert.equal(r.data.unitPriceVnd, 50000);
    });
    await check('create two designs, price from DB, random token and pending event', async () => {
      submitted = payload();
      const r = await call('/api/orders', { body: form(submitted) });
      created = expect(r, 201);
      namedSchema(created, 'OrderCreated');
      assert.equal(created.quantity, 3);
      assert.equal(created.subtotalVnd, 150000);
      assert.equal(await count('orders'), 1);
      assert.equal(await count('order_items'), 2);
      assert.equal(await count('order_status_events'), 1);
      const row = (
        await db.query('SELECT tracking_token_hash FROM orders WHERE id=$1', [created.id])
      ).rows[0];
      assert.equal(row.tracking_token_hash, digest(created.trackingToken));
      assert.equal((await files()).length, 4);
    });
    await check('duplicate key returns 409 without token or extra files', async () => {
      const before = (await files()).length;
      const r = await call('/api/orders', { body: form(submitted) });
      expect(r, 409);
      assert.equal(r.data.error.code, 'DUPLICATE_REQUEST');
      assert.ok(!('trackingToken' in r.data));
      assert.equal(await count('orders'), 1);
      assert.equal((await files()).length, before);
    });
    await check('parallel same-key creates one order and cleans losing files', async () => {
      const b = payload(),
        before = await count('orders'),
        n = (await files()).length;
      const pair = await Promise.all([
        call('/api/orders', { body: form(b) }),
        call('/api/orders', { body: form(b) })
      ]);
      assert.deepEqual(pair.map(r => r.status).sort(), [201, 409]);
      assert.equal(await count('orders'), before + 1);
      assert.equal((await files()).length, n + 4);
    });
    await check('tracking allowlist and invalid tokens', async () => {
      const r = await call('/api/tracking/lookup', { body: { token: created.trackingToken } });
      expect(r, 200);
      namedSchema(r.data, 'PublicTracking');
      assert.equal(r.data.history[0].status, 'pending');
      for (const token of ['', 'x'.repeat(43)])
        expect(await call('/api/tracking/lookup', { body: { token } }), 404);
    });
    await check('all admin data, item files and mutations require session', async () => {
      for (const [path, method, body] of [
        ['/api/admin/session', 'GET'],
        ['/api/admin/session', 'DELETE'],
        ['/api/admin/orders', 'GET'],
        [`/api/admin/orders/${created.id}`, 'GET'],
        [`/api/admin/orders/${created.id}/items/${randomUUID()}/assets/photo`, 'GET'],
        [
          `/api/admin/orders/${created.id}/status`,
          'PATCH',
          { expectedVersion: 1, status: 'confirmed' }
        ]
      ])
        expect(await call(path, { method, body }), 401);
    });
    await check('wrong login, secure session properties and hash-only persistence', async () => {
      expect(
        await call('/api/admin/session', { body: { username: 'qa-admin', password: 'wrong' } }),
        401
      );
      const r = await login();
      const c = r.headers.get('set-cookie');
      assert.match(c, /HttpOnly/i);
      assert.match(c, /SameSite=Lax/i);
      assert.match(c, /Path=\/api\/admin/i);
      assert.match(c, /Max-Age=28800/i);
      assert.ok(!/Secure/i.test(c));
      const row = (await db.query('SELECT token_hash FROM admin_sessions')).rows.at(-1);
      assert.equal(row.token_hash, digest(cookie.split('=')[1]));
      expect(await call('/api/admin/session', { session: true }), 200);
    });
    await check('admin pagination, detail snapshots and exact original bytes', async () => {
      const list = await call('/api/admin/orders?page=1&pageSize=1&status=pending', {
        session: true
      });
      expect(list, 200);
      namedSchema(list.data, 'AdminOrderPage');
      assert.equal(list.data.items.length, 1);
      const r = await call(`/api/admin/orders/${created.id}`, { session: true });
      detail = expect(r, 200);
      namedSchema(detail, 'AdminOrderDetail');
      assert.equal(detail.items.length, 2);
      assert.equal(detail.items[0].designSnapshot.fullName, design.fullName);
      for (const [kind, bytes] of [
        ['photo', photo],
        ['preview', png]
      ]) {
        const file = await call(detail.items[0].assets[kind], { session: true });
        expect(file, 200);
        assert.equal(digest(file.bytes), digest(bytes));
        assert.match(file.headers.get('content-disposition'), /attachment/);
        assert.match(file.headers.get('cache-control'), /no-store/);
      }
      expect(
        await call(`/api/admin/orders/${randomUUID()}/items/${detail.items[0].id}/assets/photo`, {
          session: true
        }),
        404
      );
      const key = (
        await db.query('SELECT photo_key FROM order_items WHERE order_id=$1', [created.id])
      ).rows[0].photo_key;
      expect(await call(`/storage/uploads/${key}`), 404);
    });
    await check(
      'input rejects invalid crop, future dates, URLs, quantity, client prices and template',
      async () => {
        const before = await count('orders'),
          n = (await files()).length;
        for (const change of [
          b => (b.items[0].design.crop.width = 1.1),
          b => (b.items[0].design.dateOfBirth = '2099-01-01'),
          b => (b.items[0].design.dateOfBirth = '2026-02-30'),
          b => (b.items[0].design.musicUrl = 'javascript:alert(1)'),
          b => (b.items[0].design.musicUrl = 'https://open.spotify.com.evil.example/x'),
          b => (b.items[0].quantity = 11),
          b => (b.subtotalVnd = 1),
          b => (b.designConfirmed = false),
          b => (b.recipient.phone = 'bad'),
          b => (b.items[0].design.crop.x = 0.5)
        ]) {
          const b = payload();
          change(b);
          expect(await call('/api/orders', { body: form(b) }), 422);
        }
        const b = payload();
        b.items[0].templateVersion = 'old';
        expect(await call('/api/orders', { body: form(b) }), 409);
        assert.equal(await count('orders'), before);
        assert.equal((await files()).length, n);
      }
    );
    await check(
      'malformed multipart, fake/truncated/oversized images and missing pairs are rejected',
      async () => {
        const before = await count('orders'),
          n = (await files()).length;
        expect(await call('/api/orders', { body: {} }), 415);
        expect(await call('/api/orders', { body: form(payload(), { photo_0: null }) }), 400);
        const dup = form(payload());
        dup.append('payload', '{}');
        expect(await call('/api/orders', { body: dup }), 400);
        for (const data of [
          Buffer.from('not an image'),
          png.subarray(0, 33),
          photo,
          await sharp({ create: { width: 5000, height: 4001, channels: 3, background: 'red' } })
            .png()
            .toBuffer(),
          await sharp({ create: { width: 9000, height: 1, channels: 3, background: 'red' } })
            .png()
            .toBuffer()
        ])
          expect(
            await call('/api/orders', {
              body: form(payload(), { preview_0: new Blob([data], { type: 'image/png' }) })
            }),
            415
          );
        expect(
          await call('/api/orders', {
            body: form(payload(), {
              photo_0: new Blob([Buffer.alloc(5 * 1024 * 1024 + 1)], { type: 'image/jpeg' })
            })
          }),
          413
        );
        assert.equal(await count('orders'), before);
        assert.equal((await files()).length, n);
      }
    );
    await check('whole-request size cap works for known and chunked lengths', async () => {
      const oversized = Buffer.alloc(16 * 1024 * 1024 + 1);
      const send = chunked =>
        new Promise((resolve, reject) => {
          const req = httpRequest(
            base + '/api/orders',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'multipart/form-data; boundary=qa',
                ...(chunked ? {} : { 'Content-Length': oversized.length })
              }
            },
            res => {
              res.resume();
              res.on('end', () => resolve(res.statusCode));
            }
          );
          req.on('error', reject);
          if (chunked) {
            req.write(oversized.subarray(0, 8000000));
            req.end(oversized.subarray(8000000));
          } else req.flushHeaders();
        });
      assert.equal(await send(false), 413);
      assert.equal(await send(true), 413);
    });
    await check('ten designs and 100 total copies accepted, eleven designs rejected', async () => {
      const b = payload();
      b.items = Array.from({ length: 10 }, () => ({
        ...structuredClone(b.items[0]),
        quantity: 10
      }));
      const r = expect(await call('/api/orders', { body: form(b) }), 201);
      assert.equal(r.quantity, 100);
      assert.equal(r.subtotalVnd, 5000000);
      b.requestKey = randomUUID();
      b.items.push(structuredClone(b.items[0]));
      expect(await call('/api/orders', { body: form(b) }), 422);
    });
    await check('admin rejects invalid pagination and unknown fields', async () => {
      for (const suffix of [
        'page=0',
        'page=abc',
        'pageSize=51',
        'page=1&page=2',
        'status=bogus',
        'unexpected=1'
      ])
        expect(await call('/api/admin/orders?' + suffix, { session: true }), 400);
      expect(
        await call(`/api/admin/orders/${created.id}/status`, {
          session: true,
          method: 'PATCH',
          body: { expectedVersion: 1, status: 'confirmed', unitPriceVnd: 1 }
        }),
        422
      );
    });
    await check('Origin blocks login, PATCH and DELETE', async () => {
      for (const [path, method, body] of [
        ['/api/admin/session', 'POST', { username: 'qa-admin', password }],
        ['/api/admin/session', 'DELETE'],
        [
          `/api/admin/orders/${created.id}/status`,
          'PATCH',
          { expectedVersion: 1, status: 'confirmed' }
        ]
      ])
        expect(
          await call(path, {
            method,
            body,
            session: true,
            headers: { Origin: 'https://evil.example' }
          }),
          403
        );
    });
    await check('state machine, same-version conflict and public history', async () => {
      const path = `/api/admin/orders/${created.id}/status`;
      expect(
        await call(path, {
          method: 'PATCH',
          session: true,
          body: { expectedVersion: 1, status: 'completed' }
        }),
        409
      );
      const pair = await Promise.all([
        call(path, {
          method: 'PATCH',
          session: true,
          body: { expectedVersion: 1, status: 'confirmed' }
        }),
        call(path, {
          method: 'PATCH',
          session: true,
          body: { expectedVersion: 1, status: 'confirmed' }
        })
      ]);
      assert.deepEqual(pair.map(r => r.status).sort(), [200, 409]);
      const events = (
        await db.query('SELECT order_version FROM order_status_events WHERE order_id=$1', [
          created.id
        ])
      ).rows;
      assert.equal(events.length, 2);
      let version = 2;
      for (const status of ['producing', 'shipping', 'completed']) {
        const body = {
          expectedVersion: version,
          status,
          ...(status === 'shipping' ? { trackingCode: 'QA-SHIP' } : {})
        };
        const r = await call(path, { method: 'PATCH', session: true, body });
        expect(r, 200);
        namedSchema(r.data, 'AdminOrderDetail');
        assert.equal(r.data.version, ++version);
      }
      expect(
        await call(path, {
          method: 'PATCH',
          session: true,
          body: { expectedVersion: version, status: 'producing' }
        }),
        409
      );
      const tracked = expect(
        await call('/api/tracking/lookup', { body: { token: created.trackingToken } }),
        200
      );
      namedSchema(tracked, 'PublicTracking');
      assert.equal(tracked.status, 'completed');
      assert.equal(tracked.history.length, 5);
      assert.equal(tracked.trackingCode, 'QA-SHIP');
    });
    await check(
      'cancel requires reason, terminal cancellation, private reason excluded',
      async () => {
        const order = expect(await call('/api/orders', { body: form(payload()) }), 201),
          path = `/api/admin/orders/${order.id}/status`;
        expect(
          await call(path, {
            method: 'PATCH',
            session: true,
            body: { expectedVersion: 1, status: 'cancelled' }
          }),
          422
        );
        expect(
          await call(path, {
            method: 'PATCH',
            session: true,
            body: {
              expectedVersion: 1,
              status: 'cancelled',
              cancellationReason: 'Private QA reason'
            }
          }),
          200
        );
        expect(
          await call(path, {
            method: 'PATCH',
            session: true,
            body: { expectedVersion: 2, status: 'confirmed' }
          }),
          409
        );
        const r = await call('/api/tracking/lookup', { body: { token: order.trackingToken } });
        namedSchema(expect(r, 200), 'PublicTracking');
        assert.ok(!JSON.stringify(r.data).includes('Private QA reason'));
      }
    );
    await check('database event failure rolls back create, items and files', async () => {
      const before = await count('orders'),
        n = (await files()).length,
        items = await count('order_items');
      await db.exec(
        "CREATE FUNCTION qa_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA injected event failure'; END; $$; CREATE TRIGGER qa_event_failure BEFORE INSERT ON order_status_events FOR EACH ROW EXECUTE FUNCTION qa_fail_event();"
      );
      try {
        expect(await call('/api/orders', { body: form(payload()) }), 500);
        assert.equal(await count('orders'), before);
        assert.equal(await count('order_items'), items);
        assert.equal((await files()).length, n);
      } finally {
        await db.exec(
          'DROP TRIGGER qa_event_failure ON order_status_events; DROP FUNCTION qa_fail_event();'
        );
      }
    });
    await check('database event failure rolls back state and version', async () => {
      const order = expect(await call('/api/orders', { body: form(payload()) }), 201);
      await db.exec(
        "CREATE FUNCTION qa_fail_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'QA injected event failure'; END; $$; CREATE TRIGGER qa_event_failure BEFORE INSERT ON order_status_events FOR EACH ROW EXECUTE FUNCTION qa_fail_event();"
      );
      try {
        expect(
          await call(`/api/admin/orders/${order.id}/status`, {
            method: 'PATCH',
            session: true,
            body: { expectedVersion: 1, status: 'confirmed' }
          }),
          500
        );
        const r = expect(await call(`/api/admin/orders/${order.id}`, { session: true }), 200);
        assert.equal(r.status, 'pending');
        assert.equal(r.version, 1);
        assert.equal(r.history.length, 1);
      } finally {
        await db.exec(
          'DROP TRIGGER qa_event_failure ON order_status_events; DROP FUNCTION qa_fail_event();'
        );
      }
    });
    await check('order price snapshot survives catalog edits', async () => {
      await db.query('UPDATE products SET unit_price_vnd=65000 WHERE id=$1', [productId]);
      const r = expect(await call(`/api/admin/orders/${created.id}`, { session: true }), 200);
      assert.equal(r.subtotalVnd, 150000);
      assert.equal(r.productSnapshot.unitPriceVnd, 50000);
      await db.query('UPDATE products SET unit_price_vnd=50000 WHERE id=$1', [productId]);
    });
    await check('session rotation revokes old token and logout revokes new token', async () => {
      const old = cookie;
      await login();
      expect(await call('/api/admin/orders', { headers: { Cookie: old } }), 401);
      expect(await call('/api/admin/session', { method: 'DELETE', session: true }), 204);
      expect(await call('/api/admin/orders', { session: true }), 401);
      expect(await call(detail.items[0].assets.photo, { session: true }), 401);
    });
    await check('expired sessions rejected and HTTPS configuration sets Secure', async () => {
      await login();
      await db.query(
        "UPDATE admin_sessions SET created_at=CURRENT_TIMESTAMP-INTERVAL '2 hours',expires_at=CURRENT_TIMESTAMP-INTERVAL '1 hour'"
      );
      expect(await call('/api/admin/orders', { session: true }), 401);
      process.env.APP_ORIGIN = 'https://demo.example';
      await stop();
      await start();
      const r = await login();
      assert.match(r.headers.get('set-cookie'), /Secure/);
      process.env.APP_ORIGIN = 'http://localhost:5173';
    });
    await check('login rate limit is enforced', async () => {
      for (let i = 0; i < 5; i++)
        expect(
          await call('/api/admin/session', { body: { username: 'qa-admin', password: 'wrong' } }),
          401
        );
      expect(
        await call('/api/admin/session', { body: { username: 'qa-admin', password: 'wrong' } }),
        429
      );
    });
    await check('restart preserves order, events, session and original assets', async () => {
      await login();
      await stop();
      await db.close();
      db = await openDatabase();
      await start();
      const r = expect(
        await call('/api/tracking/lookup', { body: { token: created.trackingToken } }),
        200
      );
      assert.equal(r.status, 'completed');
      assert.equal(r.history.length, 5);
      expect(await call('/api/admin/orders', { session: true }), 200);
      assert.equal(
        digest((await call(detail.items[0].assets.photo, { session: true })).bytes),
        digest(photo)
      );
    });
  } finally {
    await stop();
    await db.close();
  }
});

test('migration 004 backfills historical single-design orders without changing snapshots', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-upgrade-a-'));
  process.env.DB_DRIVER = 'pglite';
  process.env.DATA_DIR = join(root, 'db');
  const db = await openDatabase();
  try {
    for (const name of ['001_initial.sql', '002_seed_demo.sql', '003_demo_cart_checkout.sql'])
      await db.exec(await readFile(join('database', name), 'utf8'));
    const orderId = randomUUID(),
      snapshot = { fullName: 'Historical QA', crop: { x: 0, y: 0, width: 1, height: 1 } };
    await db.query(
      'INSERT INTO orders(id,order_number,request_key,product_id,product_snapshot,design_snapshot,recipient_snapshot,quantity,unit_price_vnd,subtotal_vnd,photo_key,preview_key,tracking_token_hash) VALUES($1,$2,$3,$4,$5,$6,$7,2,50000,100000,$8,$9,$10)',
      [
        orderId,
        'HM-HISTORICAL-QA',
        randomUUID(),
        '11111111-1111-4111-8111-111111111111',
        JSON.stringify({ name: 'Historical QA' }),
        JSON.stringify(snapshot),
        JSON.stringify({ name: 'QA' }),
        `${randomUUID()}.jpg`,
        `${randomUUID()}.png`,
        digest(randomUUID())
      ]
    );
    await db.exec(await readFile('database/004_order_items.sql', 'utf8'));
    const item = (await db.query('SELECT * FROM order_items WHERE order_id=$1', [orderId])).rows[0];
    assert.equal(item.quantity, 2);
    assert.deepEqual(item.design_snapshot, snapshot);
    assert.equal(item.position, 0);
    const order = (await db.query('SELECT * FROM orders WHERE id=$1', [orderId])).rows[0];
    assert.equal(order.subtotal_vnd, 100000);
    assert.equal(order.photo_key, item.photo_key);
    assert.equal(order.preview_key, item.preview_key);
    assert.equal(await db.query('SELECT id FROM demo_checkouts').then(r => r.rows.length), 0);
  } finally {
    await db.close();
  }
});
