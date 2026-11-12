import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createTestDatabase } from './helpers/db.mjs';
import { createApp } from '../apps/api/src/app.ts';
import { checkoutAttempt, pendingStorageKey } from '../apps/web/src/features/checkout/attempt.ts';
import { api, ApiError } from '../apps/web/src/shared/api.ts';
import { trackingResponse } from '../apps/web/src/features/checkout/responses.ts';
import { normalizePhone } from '../apps/api/src/modules/orders/lookup.ts';
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
test('shared phone normalizer accepts common domestic formats', () => {
  for (const input of ['0912 345 678', '+84912345678', '84-912-345-678'])
    assert.equal(normalizePhone(input), '0912345678');
  assert.throws(() => normalizePhone('not-a-phone'));
});

test('inactive product rejection is definitive and clears the pending checkout key', async () => {
  const nativeFetch = globalThis.fetch;
  const storage = store();
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        error: { code: 'PRODUCT_INACTIVE', message: 'Sản phẩm đang tạm ngừng nhận đơn.' }
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } }
    );
  try {
    const attempt = checkoutAttempt(storage);
    const item = {
      payload: {
        productId: '11111111-1111-4111-8111-111111111111',
        templateVersion: 'harmea-card-v1',
        quantity: 1,
        design: {
          fullName: 'Thử',
          musicUrl: 'https://open.spotify.com/track/test',
          crop: { x: 0, y: 0, width: 1, height: 1 }
        }
      },
      photo: new Blob(['photo'], { type: 'image/jpeg' }),
      preview: new Blob(['preview'], { type: 'image/png' })
    };
    await assert.rejects(
      attempt.submit(
        [item],
        { name: 'Người nhận', phone: '0900000000', address: 'Địa chỉ thử đủ mười ký tự', note: '' },
        true
      ),
      error => error.kind === 'input' && error.message.includes('Tạm ngừng nhận đơn')
    );
    assert.equal(attempt.pendingKey(), '');
    assert.equal(storage.getItem(pendingStorageKey), null);
  } finally {
    globalThis.fetch = nativeFetch;
  }
});

test('browser checkout coordinator against real Express, MySQL and image files', async t => {
  const testDatabase = await createTestDatabase(t);
  const root = await mkdtemp(join(tmpdir(), 'harmea-checkout-c-'));
  process.env.UPLOAD_DIR = join(root, 'uploads');
  process.env.APP_URL = 'http://localhost:5173';
  process.env.LOOKUP_SECRET = randomBytes(32).toString('base64url');
  const db = await openDatabase();
  const nativeFetch = globalThis.fetch;
  let server,
    base,
    mode = 'normal',
    requests = [];
  const start = async () => {
    server = createApp(db).listen(0, '127.0.0.1');
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
    Number((await db.query('SELECT CAST(COUNT(*) AS UNSIGNED) AS n FROM orders')).rows[0].n);
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
      assert.equal(latestReceipt.subtotalVnd, 356000);
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
          'SELECT photo_key,preview_key,design_snapshot FROM order_items WHERE order_id=? ORDER BY position',
          [latestReceipt.id]
        )
      ).rows[0];
      const storedPhoto = await readFile(join(process.env.UPLOAD_DIR, row.photo_key));
      const storedPhotoMeta = await sharp(storedPhoto).metadata();
      assert.equal(storedPhotoMeta.format, 'jpeg');
      assert.deepEqual([storedPhotoMeta.width, storedPhotoMeta.height], [120, 80]);
      assert.equal(storedPhotoMeta.exif, undefined);
      assert.notEqual(hash(storedPhoto), hash(original));
      assert.equal(row.design_snapshot.dateOfBirth, '2003-01-15');
      assert.deepEqual(row.design_snapshot.crop, prepared[0].payload.design.crop);
      assert.deepEqual(
        await sharp(await readFile(join(process.env.UPLOAD_DIR, row.preview_key)))
          .ensureAlpha()
          .raw()
          .toBuffer(),
        await sharp(Buffer.from(await prepared[0].preview.arrayBuffer()))
          .ensureAlpha()
          .raw()
          .toBuffer()
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
      'received order number survives storage cleanup failure and next intentional order is fresh',
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
        assert.match(first.receipt.orderNumber, /^HM-[0-9A-F]{16}$/);
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
      'customer transfer report is private, durable and idempotent without changing order state',
      async () => {
        const payload = { orderNumber: latestReceipt.orderNumber, phone: recipient.phone };
        await assert.rejects(
          api('/tracking/payment-confirm', { ...payload, phone: '0911111111' }),
          error => error instanceof ApiError && error.status === 404
        );
        const first = await api('/tracking/payment-confirm', payload);
        assert.equal(first.orderNumber, latestReceipt.orderNumber);
        assert.ok(Number.isFinite(Date.parse(first.reportedAt)));
        const parallel = await Promise.all(
          Array.from({ length: 3 }, () => api('/tracking/payment-confirm', payload))
        );
        assert.ok(parallel.every(report => report.reportedAt === first.reportedAt));
        const events = (
          await db.query('SELECT * FROM order_payment_reports WHERE order_id=?', [latestReceipt.id])
        ).rows;
        assert.equal(events.length, 1);
        const detail = await (
          await nativeFetch(base + `/api/admin/orders/${latestReceipt.id}`)
        ).json();
        assert.equal(detail.customerPaymentReportedAt, first.reportedAt);
        assert.equal(detail.version, 1);
        assert.equal(detail.status, 'pending');
        assert.equal(detail.history.length, 1);
        await stop();
        await start();
        assert.deepEqual(await api('/tracking/payment-confirm', payload), first);
        // Wrong attempts share the lookup limiter with the report endpoint.
        for (let i = 0; i < 5; i++) {
          await assert.rejects(
            api('/tracking/payment-confirm', { ...payload, phone: '0911111111' }),
            error => error instanceof ApiError && error.status === 404
          );
        }
        await assert.rejects(
          api('/tracking/lookup', payload),
          error => error instanceof ApiError && error.status === 429
        );
      }
    );
    await check('cancelled orders cannot report transfers', async () => {
      const result = await checkoutAttempt(store()).submit(items(), recipient, true);
      const order = result.receipt;
      const response = await nativeFetch(base + `/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: 1,
          status: 'cancelled',
          cancellationReason: 'QA cancellation'
        })
      });
      assert.equal(response.status, 200);
      await assert.rejects(
        api('/tracking/payment-confirm', {
          orderNumber: order.orderNumber,
          phone: recipient.phone
        }),
        error => error instanceof ApiError && error.status === 409
      );
      assert.equal(
        (await db.query('SELECT * FROM order_payment_reports WHERE order_id=?', [order.id])).rows
          .length,
        0
      );
    });
    await check(
      'tracking refresh reads admin updates and refuses extra private response fields',
      async () => {
        const lookup = { orderNumber: latestReceipt.orderNumber, phone: recipient.phone };
        const first = trackingResponse(await api('/tracking/lookup', lookup));
        assert.equal(first.status, 'pending');
        assert.ok(!('subtotalVnd' in first));
        const updated = await nativeFetch(base + `/api/admin/orders/${latestReceipt.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: 1, status: 'confirmed' })
        });
        assert.equal(updated.status, 200);
        const refreshed = trackingResponse(await api('/tracking/lookup', lookup));
        assert.equal(refreshed.status, 'confirmed');
        assert.equal(refreshed.history.length, 2);
        assert.throws(() => trackingResponse({ ...refreshed, recipient: { name: 'private' } }));
        await assert.rejects(
          api('/tracking/lookup', { orderNumber: 'bad-token', phone: recipient.phone }),
          error => error instanceof ApiError && error.status === 404
        );
        assert.ok(requests.every(r => r.search === '' && r.fragment === ''));
        assert.ok(requests.every(r => !r.path.includes(latestReceipt.orderNumber)));
      }
    );
  } finally {
    globalThis.fetch = nativeFetch;
    await stop();
    await db.close();
    await testDatabase.destroy();
    await rm(root, { recursive: true, force: true });
  }
});
