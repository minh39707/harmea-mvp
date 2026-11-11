import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { createApp } from '../../apps/api/src/app.ts';
import { openDatabase } from '../../apps/api/src/db.ts';
import { createTestDatabase } from './db.mjs';

export async function storageOrderFlow(t, storage) {
  const testDatabase = await createTestDatabase(t);
  const before = { admin: process.env.ADMIN_ENABLED, secret: process.env.LOOKUP_SECRET };
  process.env.ADMIN_ENABLED = 'true';
  process.env.LOOKUP_SECRET = 'storage-integration-test-secret-32-bytes';
  const db = await openDatabase();
  let server;
  const start = async enabled => {
    process.env.ADMIN_ENABLED = String(enabled);
    server = createApp(db, { storage }).listen(0, '127.0.0.1');
    await new Promise(resolve => server.once('listening', resolve));
    return `http://127.0.0.1:${server.address().port}`;
  };
  const stop = () => new Promise(resolve => server.close(resolve));
  try {
    let base = await start(true);
    const product = await (await fetch(base + '/api/products/current')).json();
    const photo = await sharp({
      create: { width: 40, height: 60, channels: 3, background: '#abc' }
    })
      .jpeg()
      .toBuffer();
    const preview = await sharp(photo).png().toBuffer();
    const payload = {
      requestKey: randomUUID(),
      designConfirmed: true,
      recipient: { name: 'Storage fixture', phone: '0900000000', address: 'Test only address' },
      items: [
        {
          productId: product.id,
          templateVersion: product.templateVersion,
          quantity: 1,
          design: {
            fullName: 'Storage fixture',
            color: 'cream',
            musicUrl: 'https://open.spotify.com/track/fixture',
            crop: { x: 0, y: 0, width: 1, height: 1 }
          }
        }
      ]
    };
    const form = value => {
      const data = new FormData();
      data.set('payload', JSON.stringify(value));
      data.set('photo_0', new Blob([photo], { type: 'image/jpeg' }), 'photo.jpg');
      data.set('preview_0', new Blob([preview], { type: 'image/png' }), 'preview.png');
      return data;
    };
    const created = await fetch(base + '/api/orders', { method: 'POST', body: form(payload) });
    assert.equal(created.status, 201);
    const receipt = await created.json();
    const item = (await db.query('SELECT * FROM order_items WHERE order_id=?', [receipt.id]))
      .rows[0];
    if (storage.root) {
      const { stdout } = await promisify(execFile)(
        process.execPath,
        ['scripts/migrate-uploads-to-s3.mjs', '--dry-run'],
        {
          cwd: process.cwd(),
          encoding: 'utf8',
          env: {
            ...process.env,
            UPLOAD_DIR: storage.root,
            STORAGE_DRIVER: 's3',
            S3_BUCKET: '',
            AWS_REGION: '',
            AWS_EC2_METADATA_DISABLED: 'true'
          }
        }
      );
      assert.deepEqual(JSON.parse(stdout), { checked: 2, copied: 0, skipped: 0, dryRun: true });
    }
    assert.ok(await storage.exists(item.photo_key));
    assert.ok(await storage.exists(item.preview_key));
    const path = `/api/admin/orders/${receipt.id}/items/${item.id}/assets/photo`;
    const image = await fetch(base + path);
    assert.equal(image.status, 200);
    assert.equal(image.headers.get('cache-control'), 'private, no-store');
    assert.equal(image.headers.get('content-type'), 'image/jpeg');
    assert.match(image.headers.get('content-disposition'), /attachment/);
    const actual = Buffer.from(await image.arrayBuffer());
    assert.equal((await sharp(actual).metadata()).format, 'jpeg');
    const tracked = await fetch(base + '/api/tracking/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderNumber: receipt.orderNumber, phone: payload.recipient.phone })
    });
    const publicBody = await tracked.json();
    assert.equal(tracked.status, 200);
    assert.ok(!('items' in publicBody));
    assert.equal((await fetch(base + '/health')).status, 200);
    assert.equal((await fetch(base + '/ready')).status, 200);
    assert.equal((await fetch(base + `/storage/uploads/${item.photo_key}`)).status, 404);

    const written = [];
    const originalPut = storage.put.bind(storage);
    storage.put = async (...args) => {
      await originalPut(...args);
      written.push(args[0]);
    };
    try {
      const rejected = await fetch(base + '/api/orders', {
        method: 'POST',
        body: form({
          ...payload,
          requestKey: randomUUID(),
          items: [{ ...payload.items[0], templateVersion: 'outdated-template' }]
        })
      });
      assert.equal(rejected.status, 409);
      assert.equal(written.length, 2);
      for (const key of written) assert.equal(await storage.exists(key), false);
      assert.equal(Number((await db.query('SELECT COUNT(*) AS n FROM orders')).rows[0].n), 1);
      written.length = 0;
      await db.query(
        "CREATE TRIGGER storage_fixture_failure BEFORE INSERT ON order_status_events FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='fixture transaction failure'"
      );
      try {
        const rolledBack = await fetch(base + '/api/orders', {
          method: 'POST',
          body: form({ ...payload, requestKey: randomUUID() })
        });
        assert.equal(rolledBack.status, 500);
        assert.equal(written.length, 2);
        for (const key of written) assert.equal(await storage.exists(key), false);
        for (const table of ['orders', 'order_items', 'order_status_events'])
          assert.equal(Number((await db.query(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n), 1);
      } finally {
        await db.query('DROP TRIGGER storage_fixture_failure');
      }
    } finally {
      storage.put = originalPut;
    }
    // A failed second write must remove the already completed first write.
    const partial = [];
    storage.put = async (...args) => {
      if (partial.length) throw new Error('fixture second write failure');
      await originalPut(...args);
      partial.push(args[0]);
    };
    try {
      const rejected = await fetch(base + '/api/orders', {
        method: 'POST',
        body: form({ ...payload, requestKey: randomUUID() })
      });
      assert.equal(rejected.status, 500);
      assert.equal(partial.length, 1);
      assert.equal(await storage.exists(partial[0]), false);
    } finally {
      storage.put = originalPut;
    }

    await stop();
    base = await start(false);
    assert.equal((await fetch(base + path)).status, 404);
    await stop();
    base = await start(true);
    assert.deepEqual(Buffer.from(await (await fetch(base + path)).arrayBuffer()), actual);
    await storage.delete(item.photo_key);
    const missing = await fetch(base + path);
    assert.equal(missing.status, 404);
    assert.equal((await missing.json()).error.code, 'ASSET_NOT_FOUND');
    await storage.delete(item.preview_key);
  } finally {
    if (server?.listening) await stop();
    await db.close();
    await testDatabase.destroy();
    for (const [key, value] of [
      ['ADMIN_ENABLED', before.admin],
      ['LOOKUP_SECRET', before.secret]
    ])
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
  }
}
