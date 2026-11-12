import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createTestDatabase } from './helpers/db.mjs';
import { createApp } from '../apps/api/src/app.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';
import { orderForm, orderInput } from '../apps/web/src/features/checkout/order-form.ts';

const requestJson = async (base, path, init) => {
  const response = await fetch(base + path, init);
  let body = null;
  if (response.headers.get('content-type')?.includes('application/json'))
    body = await response.json();
  return { response, body };
};

test('R3 admin products, stats, CSV and gate work against MySQL', async t => {
  const testDatabase = await createTestDatabase(t);
  const root = await mkdtemp(join(tmpdir(), 'harmea-admin-r3-'));
  const previous = {
    upload: process.env.UPLOAD_DIR,
    secret: process.env.LOOKUP_SECRET,
    node: process.env.NODE_ENV,
    admin: process.env.ADMIN_ENABLED
  };
  Object.assign(process.env, {
    UPLOAD_DIR: join(root, 'uploads'),
    LOOKUP_SECRET: randomBytes(32).toString('base64url'),
    NODE_ENV: 'development'
  });
  let db = await openDatabase();
  let server;
  let base;
  let oldOrder;
  let newOrder;
  const start = async enabled => {
    process.env.ADMIN_ENABLED = enabled ? 'true' : 'false';
    server = createApp(db).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    server = undefined;
  };

  const photo = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#a8b6bd' }
  })
    .jpeg()
    .toBuffer();
  const preview = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#e8d7bf' }
  })
    .png()
    .toBuffer();
  const preparedFor = (product, quantity = 1, fullName = 'Thiết kế thử R3') => {
    const design = {
      ...blankDesign,
      fullName,
      musicUrl: 'https://open.spotify.com/track/r3-test-only',
      photo: `data:image/jpeg;base64,${photo.toString('base64')}`,
      photoWidth: 120,
      photoHeight: 80,
      crop: centerCrop(120, 80)
    };
    return {
      payload: {
        productId: product.id,
        templateVersion: product.templateVersion,
        quantity,
        design: orderDesign(design)
      },
      photo: new Blob([photo], { type: 'image/jpeg' }),
      preview: new Blob([preview], { type: 'image/png' })
    };
  };
  const createOrder = async (product, options = {}) => {
    const prepared = preparedFor(product, options.quantity ?? 1, options.fullName);
    const payload = orderInput(
      [prepared],
      {
        name: options.name ?? 'Người nhận thử R3',
        phone: '0900000000',
        address: options.address ?? 'Địa chỉ hư cấu đủ mười ký tự',
        note: ''
      },
      true
    );
    const response = await fetch(`${base}/api/orders`, {
      method: 'POST',
      body: orderForm(payload, [prepared], randomUUID())
    });
    const body = await response.json();
    return { response, body };
  };
  const patchProduct = (productId, body) =>
    requestJson(base, `/api/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  const setDate = (orderId, utcDateTime) =>
    db.query('UPDATE orders SET created_at=? WHERE id=?', [utcDateTime, orderId]);

  try {
    await start(false);
    await t.test('all new API and page routes return the same 404 while gate is off', async () => {
      const denied = [
        ['GET', '/api/admin/products'],
        ['PATCH', '/api/admin/products/11111111-1111-4111-8111-111111111111'],
        ['GET', '/api/admin/stats'],
        ['GET', '/api/admin/orders.csv']
      ];
      for (const [method, path] of denied) {
        const response = await fetch(base + path, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: method === 'PATCH' ? '{}' : undefined
        });
        assert.equal(response.status, 404, path);
        assert.equal((await response.json()).error.code, 'NOT_FOUND');
      }
      for (const path of ['/admin/products', '/admin/stats'])
        assert.equal((await fetch(base + path)).status, 404);
    });

    await stop();
    await start(true);
    await t.test(
      'price edits are versioned; history and order price snapshots are transactional',
      async () => {
        const catalog = await requestJson(base, '/api/products/current');
        assert.equal(catalog.response.status, 200);
        const oldProduct = catalog.body;
        oldOrder = await createOrder(oldProduct, {
          quantity: 2,
          name: '=SUM(1,1)',
          address: '@HYPERLINK("https://example.invalid", "x")'
        });
        assert.equal(oldOrder.response.status, 201, JSON.stringify(oldOrder.body));
        assert.equal(oldOrder.body.unitPriceVnd, 89000);

        const listed = await requestJson(base, '/api/admin/products');
        assert.equal(listed.response.status, 200);
        assert.equal(listed.body.length, 1);
        assert.equal(listed.body[0].version, 2);
        const baseVersion = listed.body[0].version;
        const changed = await patchProduct(oldProduct.id, {
          expectedVersion: baseVersion,
          name: 'Harméa NFC Music Card',
          description: 'Mô tả sản phẩm R3',
          unitPriceVnd: 60000
        });
        assert.equal(changed.response.status, 200, JSON.stringify(changed.body));
        assert.equal(changed.body.version, baseVersion + 1);
        assert.equal(changed.body.unitPriceVnd, 60000);

        const stale = await patchProduct(oldProduct.id, {
          expectedVersion: baseVersion,
          unitPriceVnd: 70000
        });
        assert.equal(stale.response.status, 409);
        const invalidPrice = await patchProduct(oldProduct.id, {
          expectedVersion: baseVersion + 1,
          unitPriceVnd: 999
        });
        assert.equal(invalidPrice.response.status, 422);

        const history = await db.query(
          'SELECT old_price,new_price FROM product_price_history WHERE product_id=? ORDER BY id',
          [oldProduct.id]
        );
        assert.deepEqual(
          history.rows.map(row => [Number(row.old_price), Number(row.new_price)]),
          [
            [50000, 89000],
            [89000, 60000]
          ]
        );
        const oldDetail = await requestJson(base, `/api/admin/orders/${oldOrder.body.id}`);
        assert.equal(oldDetail.body.unitPriceVnd, 89000);
        assert.equal(oldDetail.body.productSnapshot.unitPriceVnd, 89000);

        const current = (await requestJson(base, '/api/products/current')).body;
        assert.equal(current.name, 'Harméa NFC Music Card');
        assert.equal(current.description, 'Mô tả sản phẩm R3');
        newOrder = await createOrder(current, { quantity: 1 });
        assert.equal(newOrder.response.status, 201, JSON.stringify(newOrder.body));
        assert.equal(newOrder.body.unitPriceVnd, 60000);
        const newDetail = await requestJson(base, `/api/admin/orders/${newOrder.body.id}`);
        assert.equal(newDetail.body.unitPriceVnd, 60000);

        await db.exec(`CREATE TRIGGER fail_r3_price_history BEFORE INSERT ON product_price_history
        FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='forced test failure'`);
        const failed = await patchProduct(oldProduct.id, {
          expectedVersion: baseVersion + 1,
          unitPriceVnd: 70000
        });
        assert.equal(failed.response.status, 500);
        await db.exec('DROP TRIGGER fail_r3_price_history');
        const afterRollback = (await requestJson(base, '/api/admin/products')).body[0];
        assert.equal(afterRollback.unitPriceVnd, 60000);
        assert.equal(afterRollback.version, baseVersion + 1);
        assert.equal(
          (
            await db.query('SELECT id FROM product_price_history WHERE product_id=?', [
              oldProduct.id
            ])
          ).rows.length,
          2
        );

        await setDate(oldOrder.body.id, '2026-11-10 16:30:00.000');
        await setDate(newOrder.body.id, '2026-11-11 00:30:00.000');
      }
    );

    const product = (await requestJson(base, '/api/admin/products')).body[0];
    const paused = await patchProduct(product.id, {
      expectedVersion: product.version,
      isActive: false
    });
    assert.equal(paused.response.status, 200);
    assert.equal(paused.body.isActive, false);
    const inactiveCatalog = await requestJson(base, '/api/products/current');
    assert.equal(inactiveCatalog.body.isActive, false);
    const rejected = await createOrder(inactiveCatalog.body);
    assert.equal(rejected.response.status, 409);
    assert.equal(rejected.body.error.code, 'PRODUCT_INACTIVE');
    const resumed = await patchProduct(product.id, {
      expectedVersion: paused.body.version,
      isActive: true
    });
    assert.equal(resumed.response.status, 200);

    const cancelledOrder = await createOrder(resumed.body, { quantity: 3 });
    assert.equal(cancelledOrder.response.status, 201);
    await setDate(cancelledOrder.body.id, '2026-11-10 16:59:00.000');
    const cancelled = await requestJson(
      base,
      `/api/admin/orders/${cancelledOrder.body.id}/status`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedVersion: 1,
          status: 'cancelled',
          cancellationReason: 'Fixture hủy R3'
        })
      }
    );
    assert.equal(cancelled.response.status, 200);

    await t.test(
      'order-number prefix search and Vietnam-time SQL statistics are correct',
      async () => {
        const prefix = (
          await requestJson(
            base,
            `/api/admin/orders?orderNumber=${cancelledOrder.body.orderNumber.slice(0, 8)}`
          )
        ).body;
        assert.ok(prefix.items.some(order => order.id === cancelledOrder.body.id));
        const exact = (
          await requestJson(
            base,
            `/api/admin/orders?orderNumber=${cancelledOrder.body.orderNumber}`
          )
        ).body;
        assert.equal(exact.total, 1);
        assert.equal(exact.items[0].id, cancelledOrder.body.id);

        const allDates = await requestJson(base, '/api/admin/stats?from=2026-11-10&to=2026-11-11');
        assert.equal(allDates.response.status, 200);
        assert.equal(allDates.body.ordersByStatus.pending, 2);
        assert.equal(allDates.body.ordersByStatus.cancelled, 1);
        assert.equal(allDates.body.subtotalVnd, 238000);
        assert.equal(allDates.body.cardCount, 3);
        assert.deepEqual(allDates.body.ordersByDay, [
          { date: '2026-11-10', orderCount: 2 },
          { date: '2026-11-11', orderCount: 1 }
        ]);

        const boundary = (await requestJson(base, '/api/admin/stats?from=2026-11-10&to=2026-11-10'))
          .body;
        assert.equal(boundary.subtotalVnd, 178000);
        assert.equal(boundary.cardCount, 2);
        assert.deepEqual(boundary.ordersByDay, [{ date: '2026-11-10', orderCount: 2 }]);
        const invalidRange = await requestJson(
          base,
          '/api/admin/stats?from=2026-11-12&to=2026-11-10'
        );
        assert.equal(invalidRange.response.status, 422);
      }
    );

    await t.test(
      'CSV is BOM encoded, streamed, filtered, escaped and excludes music URLs',
      async () => {
        const response = await fetch(`${base}/api/admin/orders.csv?from=2026-11-10&to=2026-11-11`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('content-type') ?? '', /text\/csv; charset=utf-8/);
        assert.match(response.headers.get('content-disposition') ?? '', /attachment/);
        const bytes = Buffer.from(await response.arrayBuffer());
        assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf]);
        const csv = bytes.toString('utf8');
        assert.equal(
          csv.slice(1).split('\r\n')[0],
          '"Mã đơn","Ngày","Trạng thái","Số thiết kế","Số thẻ","Tổng tiền","Tên người nhận","SĐT","Địa chỉ","Mã vận đơn"'
        );
        assert.ok(csv.includes("'=SUM(1,1)"));
        assert.ok(csv.includes("'@HYPERLINK"));
        assert.ok(csv.includes(oldOrder.body.orderNumber));
        assert.ok(!csv.includes('open.spotify.com'));
        const onlyCancelled = await fetch(`${base}/api/admin/orders.csv?status=cancelled`);
        const cancelledCsv = Buffer.from(await onlyCancelled.arrayBuffer()).toString('utf8');
        assert.ok(cancelledCsv.includes(cancelledOrder.body.orderNumber));
        assert.ok(!cancelledCsv.includes(oldOrder.body.orderNumber));
      }
    );
  } finally {
    await stop();
    await db.close();
    await testDatabase.destroy();
    await rm(root, { recursive: true, force: true });
    const restore = (key, value) =>
      value === undefined ? delete process.env[key] : (process.env[key] = value);
    restore('UPLOAD_DIR', previous.upload);
    restore('LOOKUP_SECRET', previous.secret);
    restore('NODE_ENV', previous.node);
    restore('ADMIN_ENABLED', previous.admin);
  }
});
