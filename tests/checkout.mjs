import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, scryptSync, createHash } from 'node:crypto';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createApp } from '../apps/api/src/app.ts';
import { checkoutAttempt, pendingStorageKey } from '../apps/web/src/features/checkout/attempt.ts';
import { api, ApiError } from '../apps/web/src/shared/api.ts';
import { trackingResponse } from '../apps/web/src/features/checkout/responses.ts';
import { trackingToken, trackingLink } from '../apps/web/src/features/tracking/links.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';

const hash = value => createHash('sha256').update(value).digest('hex');
function store(initial) {
  const map = new Map(initial ? [[pendingStorageKey, initial]] : []),
    writes = [];
  return {
    writes,
    map,
    getItem: k => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
      writes.push(v);
    },
    removeItem: k => map.delete(k)
  };
}
test('tracking links keep secrets in fragments and reject query-string lookup', () => {
  const token = randomBytes(32).toString('base64url');
  for (const input of [
    token,
    `#${token}`,
    `/track#${token}`,
    `http://localhost:5173/track#${token}`
  ])
    assert.ok(trackingToken(input) === token);
  const url = new URL(trackingLink('http://localhost:5173', token));
  assert.equal(url.pathname, '/track');
  assert.equal(url.search, '');
  assert.ok(url.hash === `#${token}`);
  for (const input of [
    `http://localhost/track?token=${token}`,
    `javascript:alert(1)#${token}`,
    'bad-token'
  ])
    assert.throws(() => trackingToken(input));
});

test('browser checkout coordinator against real Express, PGlite and image files', async t => {
  const root = await mkdtemp(join(tmpdir(), 'harmea-checkout-c-'));
  process.env.DB_DRIVER = 'pglite';
  process.env.DATA_DIR = join(root, 'db');
  process.env.UPLOAD_DIR = join(root, 'uploads');
  process.env.APP_ORIGIN = 'http://localhost:5173';
  process.env.ADMIN_USERNAME = 'qa-admin';
  const password = randomBytes(24).toString('base64url'),
    salt = randomBytes(16).toString('hex');
  process.env.ADMIN_PASSWORD_HASH = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
  const db = await openDatabase();
  for (const file of (await readdir('database')).filter(n => /^\d+.*\.sql$/.test(n)).sort())
    await db.exec(await readFile(join('database', file), 'utf8'));
  const nativeFetch = globalThis.fetch;
  let server,
    base,
    mode = 'normal',
    requests = [];
  const start = async () => {
    server = createApp(db, 'isolated-checkout-qa').listen(0, '127.0.0.1');
    await new Promise(r => server.once('listening', r));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (server) {
      await new Promise(r => server.close(r));
      server = null;
    }
  };
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), base),
      entry = { path: url.pathname, search: url.search, fragment: url.hash };
    if (init?.body instanceof FormData) {
      entry.key = JSON.parse(init.body.get('payload')).requestKey;
      entry.parts = [...init.body.keys()];
      entry.payload = JSON.parse(init.body.get('payload'));
      entry.manualContentType = Boolean(new Headers(init.headers).get('Content-Type'));
    }
    requests.push(entry);
    if (mode === 'unreachable' && url.pathname === '/api/orders')
      return nativeFetch('http://127.0.0.1:1/api/orders', init);
    const response = await nativeFetch(url, {
      ...init,
      ...(mode === 'foreign-origin' && url.pathname === '/api/orders'
        ? { headers: { ...init.headers, Origin: 'https://evil.example' } }
        : {})
    });
    if (
      url.pathname === '/api/orders' &&
      response.status === 201 &&
      ['drop-committed', 'corrupt-committed'].includes(mode)
    ) {
      await response.arrayBuffer();
      if (mode === 'drop-committed') throw TypeError('QA dropped response after real commit');
      return new Response('{}', { status: 201, headers: { 'Content-Type': 'application/json' } });
    }
    return response;
  };
  const check = async (name, run) =>
    t.test(name, async () => {
      await stop();
      await start();
      mode = 'normal';
      requests = [];
      await run();
    });
  const count = async () =>
    Number((await db.query('SELECT count(*)::int AS n FROM orders')).rows[0].n);
  const original = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#8facb8' }
  })
    .jpeg()
    .toBuffer();
  const prepared = [];
  for (const fullName of ['QA Nguyễn Minh', 'QA thiết kế thứ hai']) {
    const design = {
      ...blankDesign,
      fullName,
      musicUrl: 'https://open.spotify.com/track/qa',
      photo: 'data:image/jpeg;base64,' + original.toString('base64'),
      photoWidth: 120,
      photoHeight: 80,
      crop: centerCrop(120, 80),
      dateOfBirth: '2003-01-15'
    };
    const png = await sharp(Buffer.from(cardSvg(design)))
      .png()
      .toBuffer();
    prepared.push({
      payload: {
        productId: '11111111-1111-4111-8111-111111111111',
        templateVersion: 'harmea-card-v1',
        quantity: 2,
        design: orderDesign(design)
      },
      photo: new Blob([original], { type: 'image/jpeg' }),
      preview: new Blob([png], { type: 'image/png' })
    });
  }
  const items = () => prepared.map(i => ({ ...i, payload: structuredClone(i.payload) }));
  const recipient = {
    name: 'QA Người nhận',
    phone: '0900000000',
    address: 'Địa chỉ giả dùng kiểm thử',
    note: 'Không giao hàng thật'
  };
  let latestReceipt;
  try {
    await check('multipart carries B output, original bytes and canonical fields', async () => {
      const storage = store(),
        attempt = checkoutAttempt(storage),
        before = await count();
      const result = await attempt.submit(items(), recipient, true);
      latestReceipt = result.receipt;
      assert.equal(await count(), before + 1);
      assert.equal(latestReceipt.quantity, 4);
      assert.equal(latestReceipt.subtotalVnd, 200000);
      assert.deepEqual(requests[0].parts, [
        'payload',
        'photo_0',
        'preview_0',
        'photo_1',
        'preview_1'
      ]);
      assert.equal(requests[0].manualContentType, false);
      assert.equal(requests[0].payload.note, recipient.note);
      assert.ok(!('note' in requests[0].payload.recipient));
      assert.ok(!('photo' in requests[0].payload.items[0].design));
      const row = (
        await db.query(
          'SELECT photo_key,preview_key,design_snapshot FROM order_items WHERE order_id=$1 ORDER BY position',
          [latestReceipt.id]
        )
      ).rows[0];
      assert.equal(
        hash(await readFile(join(process.env.UPLOAD_DIR, row.photo_key))),
        hash(original)
      );
      assert.equal(row.design_snapshot.dateOfBirth, '2003-01-15');
      assert.deepEqual(row.design_snapshot.crop, prepared[0].payload.design.crop);
      assert.equal(
        hash(await readFile(join(process.env.UPLOAD_DIR, row.preview_key))),
        hash(Buffer.from(await prepared[0].preview.arrayBuffer()))
      );
      assert.equal(storage.getItem(pendingStorageKey), null);
      const recorded = JSON.parse(storage.writes[0]);
      assert.deepEqual(Object.keys(recorded).sort(), ['fingerprint', 'requestKey']);
      assert.ok(!storage.writes[0].includes(recipient.address));
    });
    await check(
      'QA-07: two intentional identical orders after success use different keys',
      async () => {
        const attempt = checkoutAttempt(store()),
          before = await count();
        const first = await attempt.submit(items(), recipient, true),
          second = await attempt.submit(items(), recipient, true);
        assert.notEqual(first.receipt.id, second.receipt.id);
        assert.notEqual(requests[0].key, requests[1].key);
        assert.equal(await count(), before + 2);
        assert.equal(attempt.pendingKey(), '');
      }
    );
    await check('double click during submit sends only one POST', async () => {
      const attempt = checkoutAttempt(store()),
        before = await count();
      const pair = await Promise.all([
        attempt.submit(items(), recipient, true),
        attempt.submit(items(), recipient, true)
      ]);
      assert.equal(pair.filter(Boolean).length, 1);
      assert.equal(requests.length, 1);
      assert.equal(await count(), before + 1);
    });
    await check(
      'lost response, simulated reload and rejected retry never mint another key',
      async () => {
        const storage = store(),
          first = checkoutAttempt(storage),
          before = await count();
        mode = 'drop-committed';
        await assert.rejects(
          first.submit(items(), recipient, true),
          error => error.kind === 'uncertain'
        );
        assert.equal(await count(), before + 1);
        assert.equal(requests.length, 1);
        const key = first.pendingKey(),
          reloaded = checkoutAttempt(storage);
        assert.equal(reloaded.pendingKey(), key);
        await assert.rejects(
          reloaded.submit(items(), { ...recipient, name: 'Changed QA' }, true),
          error => error.kind === 'blocked'
        );
        assert.equal(requests.length, 1);
        mode = 'foreign-origin';
        await assert.rejects(
          reloaded.submit(items(), recipient, true),
          error => error.kind === 'uncertain'
        );
        assert.equal(reloaded.pendingKey(), key);
        mode = 'normal';
        await assert.rejects(
          reloaded.submit(items(), recipient, true),
          error => error.kind === 'duplicate' && /liên hệ/.test(error.message)
        );
        assert.equal(await count(), before + 1);
        assert.ok(requests.every(r => r.key === key));
        assert.equal(reloaded.pendingKey(), key);
      }
    );
    await check('network failure before arrival retries the same key and can succeed', async () => {
      const attempt = checkoutAttempt(store()),
        before = await count();
      mode = 'unreachable';
      await assert.rejects(
        attempt.submit(items(), recipient, true),
        error => error.kind === 'uncertain'
      );
      const key = attempt.pendingKey();
      assert.equal(await count(), before);
      mode = 'normal';
      const result = await attempt.submit(items(), recipient, true);
      assert.ok(result.receipt);
      assert.ok(requests.every(r => r.key === key));
      assert.equal(await count(), before + 1);
    });
    await check(
      'first-request validation rejection allows correction without losing data',
      async () => {
        const attempt = checkoutAttempt(store()),
          before = await count(),
          invalid = items();
        invalid[0].payload.design.crop.width = 2;
        await assert.rejects(
          attempt.submit(invalid, recipient, true),
          error => error instanceof ApiError && error.status === 422
        );
        assert.equal(await count(), before);
        assert.equal(attempt.pendingKey(), '');
        assert.equal(invalid[0].payload.design.crop.width, 2);
        assert.equal(recipient.name, 'QA Người nhận');
        const result = await attempt.submit(items(), recipient, true);
        assert.ok(result.receipt);
        assert.notEqual(requests[0].key, requests[1].key);
        assert.equal(await count(), before + 1);
      }
    );
    await check(
      'malformed success response is uncertain, not a fake success or a second order',
      async () => {
        const attempt = checkoutAttempt(store()),
          before = await count();
        mode = 'corrupt-committed';
        await assert.rejects(attempt.submit(items(), recipient, true), e => e.kind === 'uncertain');
        const key = attempt.pendingKey();
        mode = 'normal';
        await assert.rejects(attempt.submit(items(), recipient, true), e => e.kind === 'duplicate');
        assert.equal(requests[1].key, key);
        assert.equal(await count(), before + 1);
      }
    );
    await check('unavailable/corrupt browser storage blocks POST before mutation', async () => {
      const before = await count(),
        storage = store();
      storage.setItem = () => {
        throw Error('QA storage unavailable');
      };
      await assert.rejects(
        checkoutAttempt(storage).submit(items(), recipient, true),
        e => e.kind === 'input'
      );
      await assert.rejects(
        checkoutAttempt(store('corrupted')).submit(items(), recipient, true),
        e => e.kind === 'blocked'
      );
      assert.equal(requests.length, 0);
      assert.equal(await count(), before);
    });
    await check(
      'received token survives storage cleanup failure and next intentional order is fresh',
      async () => {
        const storage = store(),
          realSet = storage.setItem;
        storage.removeItem = () => {
          throw Error();
        };
        storage.setItem = (k, v) => {
          if (!v) throw Error();
          realSet(k, v);
        };
        const attempt = checkoutAttempt(storage);
        const first = await attempt.submit(items(), recipient, true);
        assert.ok(first.storageWarning);
        assert.ok(first.receipt.trackingToken.length === 43);
        assert.equal(attempt.pendingKey(), '');
        const second = await attempt.submit(items(), recipient, true);
        assert.notEqual(first.receipt.id, second.receipt.id);
        assert.notEqual(requests[0].key, requests[1].key);
      }
    );
    await check('confirmation, recipient and total-size validation run before POST', async () => {
      const attempt = checkoutAttempt(store()),
        before = await count();
      await assert.rejects(attempt.submit(items(), recipient, false));
      await assert.rejects(attempt.submit(items(), { ...recipient, phone: 'bad' }, true));
      const huge = Array.from({ length: 4 }, () => ({
        ...items()[0],
        photo: new Blob([new Uint8Array(4 * 1024 * 1024)], { type: 'image/png' }),
        preview: new Blob([new Uint8Array(1024 * 1024)], { type: 'image/png' })
      }));
      await assert.rejects(attempt.submit(huge, recipient, true), /16 MiB/);
      assert.equal(requests.length, 0);
      assert.equal(await count(), before);
      assert.equal(attempt.pendingKey(), '');
    });
    await check(
      'tracking refresh reads admin updates and refuses extra private response fields',
      async () => {
        const token = trackingToken(trackingLink(base, latestReceipt.trackingToken));
        const first = trackingResponse(await api('/tracking/lookup', { token }));
        assert.equal(first.status, 'pending');
        assert.ok(!('subtotalVnd' in first));
        const login = await nativeFetch(base + '/api/admin/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'qa-admin', password })
        });
        assert.equal(login.status, 200);
        const cookie = login.headers.get('set-cookie').split(';')[0];
        const updated = await nativeFetch(base + `/api/admin/orders/${latestReceipt.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Cookie: cookie },
          body: JSON.stringify({ expectedVersion: 1, status: 'confirmed' })
        });
        assert.equal(updated.status, 200);
        const refreshed = trackingResponse(await api('/tracking/lookup', { token }));
        assert.equal(refreshed.status, 'confirmed');
        assert.equal(refreshed.history.length, 2);
        assert.throws(() => trackingResponse({ ...refreshed, recipient: { name: 'private' } }));
        await assert.rejects(
          api('/tracking/lookup', { token: 'bad-token' }),
          error => error instanceof ApiError && error.status === 404
        );
        assert.ok(requests.every(r => r.search === '' && r.fragment === ''));
        assert.ok(requests.every(r => !r.path.includes(token)));
      }
    );
  } finally {
    globalThis.fetch = nativeFetch;
    await stop();
    await db.close();
  }
});
