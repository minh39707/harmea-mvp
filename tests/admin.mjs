import test from 'node:test';
import assert from 'node:assert/strict';
import { access, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createTestDatabase } from './helpers/db.mjs';
import { createApp } from '../apps/api/src/app.ts';
import { checkoutAttempt } from '../apps/web/src/features/checkout/attempt.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { centerCrop } from '../apps/web/src/features/editor/geometry.ts';
import {
  adminOrders,
  adminOrder,
  changeStatus,
  privateAsset,
  AdminInputError
} from '../apps/web/src/features/admin/client.ts';
import { adminRoute } from '../apps/web/src/features/admin/route.ts';
import { api } from '../apps/web/src/shared/api.ts';

const run = promisify(execFile);
const digest = bytes =>
  import('node:crypto').then(({ createHash }) => createHash('sha256').update(bytes).digest('hex'));
const draft = (status, extra = {}) => ({
  status,
  reason: '',
  trackingCode: '',
  confirmed: true,
  ...extra
});

test('admin UI client works without app login and keeps order assets private', async t => {
  const testDatabase = await createTestDatabase(t);
  const root = await mkdtemp(join(tmpdir(), 'harmea-admin-r1-'));
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
  delete process.env.ADMIN_ENABLED;
  let db = await openDatabase();
  const nativeFetch = globalThis.fetch;
  let server, base;
  const start = async () => {
    const app = createApp(db);
    server = app.listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  };
  const stop = async () => {
    if (!server) return;
    await new Promise(resolve => server.close(resolve));
    server = undefined;
  };
  globalThis.fetch = (input, init) => nativeFetch(new URL(String(input), base), init);

  const photo = await sharp({
    create: { width: 120, height: 80, channels: 3, background: '#8facb8' }
  })
    .jpeg()
    .toBuffer();
  const design = {
    ...blankDesign,
    fullName: 'Thiết kế admin R1',
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
  const create = () =>
    checkoutAttempt({
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {}
    }).submit(
      [prepared],
      {
        name: 'Người nhận thử',
        phone: '0900000000',
        address: 'Địa chỉ hư cấu đủ độ dài',
        note: 'Không giao hàng thật'
      },
      true
    );

  try {
    await start();
    await t.test('admin route has no login page; development gate defaults on', async () => {
      assert.equal(adminRoute('/admin').kind, 'list');
      assert.equal(adminRoute('/admin/products').kind, 'products');
      assert.equal(adminRoute('/admin/stats').kind, 'stats');
      assert.equal(adminRoute('/admin/login').kind, 'missing');
      assert.equal(adminRoute('/admin/orders/not-a-uuid').kind, 'missing');
      const page = await nativeFetch(base + '/admin/login');
      assert.equal(page.status, 404);
      assert.equal((await nativeFetch(base + '/api/admin/orders')).status, 200);
    });

    await t.test(
      'admin sees order snapshots, normalized private photos and pixel-exact previews',
      async () => {
        const receipt = (await create()).receipt;
        const page = await adminOrders(1, 'pending');
        assert.equal(page.total, 1);
        assert.equal(page.items[0].id, receipt.id);
        const order = await adminOrder(receipt.id);
        assert.equal(order.items[0].designSnapshot.fullName, design.fullName);
        const photoBlob = await privateAsset(
          order.id,
          order.items[0].id,
          'photo',
          order.items[0].assets.photo
        );
        const photoBytes = Buffer.from(await photoBlob.arrayBuffer());
        const photoMeta = await sharp(photoBytes).metadata();
        assert.equal(photoMeta.format, 'jpeg');
        assert.deepEqual([photoMeta.width, photoMeta.height], [120, 80]);
        assert.equal(photoMeta.exif, undefined);
        assert.notEqual(await digest(photoBytes), await digest(photo));
        const previewBlob = await privateAsset(
          order.id,
          order.items[0].id,
          'preview',
          order.items[0].assets.preview
        );
        assert.deepEqual(
          await sharp(Buffer.from(await previewBlob.arrayBuffer()))
            .ensureAlpha()
            .raw()
            .toBuffer(),
          await sharp(png).ensureAlpha().raw().toBuffer()
        );
        const key = (
          await db.query('SELECT photo_key FROM order_items WHERE order_id=?', [order.id])
        ).rows[0].photo_key;
        assert.equal((await nativeFetch(base + `/storage/uploads/${key}`)).status, 404);
      }
    );

    await t.test(
      'state machine and optimistic version checks still apply without login',
      async () => {
        const page = await adminOrders(1, 'pending');
        let order = await adminOrder(page.items[0].id);
        await assert.rejects(
          changeStatus(order, draft('completed')),
          e => e instanceof AdminInputError
        );
        const r = await nativeFetch(`${base}/api/admin/orders/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expectedVersion: 1, status: 'completed' })
        });
        assert.equal(r.status, 409);
        order = (await changeStatus(order, draft('confirmed'))).order;
        const stale = structuredClone(order);
        order = (await changeStatus(order, draft('producing'))).order;
        const result = await changeStatus(stale, draft('producing'));
        assert.equal(result.kind, 'conflict');
        assert.equal(result.order.version, 3);
        order = (await changeStatus(result.order, draft('shipping', { trackingCode: 'R1-SHIP' })))
          .order;
        assert.equal(order.history.at(-1).actor, 'admin');
        assert.equal(order.history.length, 4);
        const tracked = await api('/tracking/lookup', {
          orderNumber: order.orderNumber,
          phone: '0900000000'
        });
        assert.equal(tracked.status, 'shipping');
        assert.equal(tracked.trackingCode, 'R1-SHIP');
        for (const key of ['recipient', 'items', 'cancellationReason', 'note'])
          assert.ok(!(key in tracked));
      }
    );

    await t.test('cancellation is private and terminal', async () => {
      const receipt = (await create()).receipt;
      const cancelled = (
        await changeStatus(
          await adminOrder(receipt.id),
          draft('cancelled', { reason: 'Lý do nội bộ thử nghiệm' })
        )
      ).order;
      assert.equal(cancelled.status, 'cancelled');
      await assert.rejects(changeStatus(cancelled, draft('confirmed')), AdminInputError);
      const tracked = await api('/tracking/lookup', {
        orderNumber: receipt.orderNumber,
        phone: '0900000000'
      });
      assert.ok(!JSON.stringify(tracked).includes('Lý do nội bộ'));
    });

    await t.test('orders and events survive API restart without session state', async () => {
      const receipt = (await create()).receipt;
      await stop();
      await db.close();
      db = await openDatabase();
      await start();
      const order = await adminOrder(receipt.id);
      assert.equal(order.status, 'pending');
      assert.equal(order.history.length, 1);
      const blob = await privateAsset(
        order.id,
        order.items[0].id,
        'photo',
        order.items[0].assets.photo
      );
      const photoBytes = Buffer.from(await blob.arrayBuffer());
      const photoMeta = await sharp(photoBytes).metadata();
      assert.equal(photoMeta.format, 'jpeg');
      assert.deepEqual([photoMeta.width, photoMeta.height], [120, 80]);
      assert.equal(photoMeta.exif, undefined);
    });
  } finally {
    globalThis.fetch = nativeFetch;
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

test('demo seed prints order numbers and creates no tracking-link file', async t => {
  const testDatabase = await createTestDatabase(t);
  const root = await mkdtemp(join(tmpdir(), 'harmea-demo-r1-'));
  const env = {
    ...process.env,
    UPLOAD_DIR: join(root, 'uploads'),
    LOOKUP_SECRET: randomBytes(32).toString('base64url'),
    DEMO_LINKS_FILE: join(root, 'private', 'links.json')
  };
  try {
    const first = await run(process.execPath, ['scripts/seed-demo.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8'
    });
    assert.equal((first.stdout.match(/HM-[0-9A-F]{16}/g) ?? []).length, 2);
    await assert.rejects(access(env.DEMO_LINKS_FILE));
    await run(process.execPath, ['scripts/seed-demo.mjs'], {
      cwd: process.cwd(),
      env,
      encoding: 'utf8'
    });
    Object.assign(process.env, env);
    const db = await openDatabase();
    try {
      const rows = (await db.query('SELECT status,version FROM orders ORDER BY status')).rows;
      assert.deepEqual(
        rows.map(row => row.status),
        ['cancelled', 'completed']
      );
      assert.deepEqual(
        rows.map(row => row.version),
        [2, 5]
      );
      assert.equal(
        Number(
          (await db.query('SELECT CAST(COUNT(*) AS UNSIGNED) AS n FROM order_status_events'))
            .rows[0].n
        ),
        7
      );
    } finally {
      await db.close();
    }
  } finally {
    await testDatabase.destroy();
    await rm(root, { recursive: true, force: true });
  }
});
