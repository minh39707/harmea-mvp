import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID, randomBytes, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import sharp from 'sharp';
import { createApp } from '../apps/api/src/app.ts';
import { openDatabase } from '../apps/api/src/db.ts';
import {
  lookupPhoneHash,
  normalizePhone,
  TrackingLookupLimiter
} from '../apps/api/src/modules/orders/lookup.ts';
import { orientedPhotoSize, imageSettings } from '../apps/api/src/modules/orders/uploads.ts';
import { createTestDatabase } from './helpers/db.mjs';
import { validateNamedSchema } from './helpers/contract.mjs';

const run = promisify(execFile);
const contract = JSON.parse(await readFile('contracts/openapi.json', 'utf8'));
const namedSchema = (value, name) => validateNamedSchema(value, name, contract);
const secret = randomBytes(32).toString('base64url');
const photoNumber = '0912345678';
const lookupBody = (orderNumber, phone = photoNumber) => ({ orderNumber, phone });
async function texturedJpeg(width, height) {
  const raw = Buffer.alloc(width * height * 3);
  let seed = 123456789;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const noise = (seed >>> 24) - 128;
      const offset = (y * width + x) * 3;
      raw[offset] = Math.max(
        0,
        Math.min(
          255,
          90 + Math.round((90 * y) / height) + Math.round(25 * Math.sin(x / 115)) + noise * 0.16
        )
      );
      raw[offset + 1] = Math.max(
        0,
        Math.min(
          255,
          70 + Math.round((105 * y) / height) + Math.round(18 * Math.cos(x / 95)) + noise * 0.13
        )
      );
      raw[offset + 2] = Math.max(
        0,
        Math.min(255, 120 + Math.round((85 * x) / width) + noise * 0.2)
      );
    }
  return sharp(raw, { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 85 })
    .toBuffer();
}

test('R1/R2 order lookup, admin gate, image processing and backfill on MySQL', async t => {
  const testDatabase = await createTestDatabase(t);
  assert.match(testDatabase.firstMigration, /Applied: 004_r1_remove_auth_add_lookup.sql/);
  assert.match(testDatabase.firstMigration, /Applied: 005_r1_finalize_lookup.sql/);
  const repeated = await testDatabase.migrate();
  assert.match(repeated, /Already applied: 004_r1_remove_auth_add_lookup.sql/);
  assert.match(repeated, /Already applied: 005_r1_finalize_lookup.sql/);

  const root = await mkdtemp(join(tmpdir(), 'harmea-r1-api-'));
  const previous = {
    uploadDir: process.env.UPLOAD_DIR,
    appUrl: process.env.APP_URL,
    lookupSecret: process.env.LOOKUP_SECRET,
    nodeEnv: process.env.NODE_ENV,
    adminEnabled: process.env.ADMIN_ENABLED,
    photoMaxEdge: process.env.PHOTO_MAX_EDGE,
    photoJpegQuality: process.env.PHOTO_JPEG_QUALITY
  };
  Object.assign(process.env, {
    UPLOAD_DIR: join(root, 'uploads'),
    APP_URL: 'http://localhost:5173',
    LOOKUP_SECRET: secret,
    NODE_ENV: 'development',
    PHOTO_MAX_EDGE: '2400',
    PHOTO_JPEG_QUALITY: '82'
  });
  delete process.env.ADMIN_ENABLED;
  let now = Date.now();
  const limiter = new TrackingLookupLimiter(() => now);
  let db = await openDatabase();
  let server;
  let base = '';
  const start = () => {
    const app = createApp(db, { trackingLimiter: limiter });
    assert.equal(app.get('trust proxy'), 1);
    server = app.listen(0, '127.0.0.1');
    return new Promise(resolve =>
      server.once('listening', () => {
        base = `http://127.0.0.1:${server.address().port}`;
        resolve();
      })
    );
  };
  const stop = async () => {
    if (server) {
      await new Promise(resolve => server.close(resolve));
      server = undefined;
    }
  };
  const call = async (
    path,
    { body, method = body === undefined ? 'GET' : 'POST', ip, headers = {} } = {}
  ) => {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(body === undefined || body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...(ip ? { 'X-Forwarded-For': ip } : {}),
        ...headers
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) })
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    let data;
    try {
      data = JSON.parse(bytes.toString('utf8'));
    } catch {
      data = null;
    }
    return { status: response.status, data, headers: response.headers, bytes };
  };
  const expect = (response, status) => {
    assert.equal(
      response.status,
      status,
      response.data?.error?.message ?? 'Unexpected HTTP status'
    );
    if (status >= 400) namedSchema(response.data, 'Error');
    return response.data;
  };
  const count = async table =>
    Number((await db.query(`SELECT CAST(COUNT(*) AS UNSIGNED) AS n FROM ${table}`)).rows[0].n);
  const png = await sharp({ create: { width: 60, height: 90, channels: 3, background: '#abc' } })
    .png()
    .toBuffer();
  const photo = await sharp(png).jpeg().toBuffer();
  const productId = '11111111-1111-4111-8111-111111111111';
  const orderPayload = (photoWidth = 60, photoHeight = 90) => ({
    requestKey: randomUUID(),
    designConfirmed: true,
    items: [
      {
        productId,
        templateVersion: 'harmea-card-v1',
        quantity: 2,
        design: {
          fullName: 'R1 private recipient test',
          musicUrl: 'https://open.spotify.com/track/private-r1-url',
          color: 'blue',
          crop: { x: 0, y: 0, width: 1, height: 1 },
          photoWidth,
          photoHeight
        }
      }
    ],
    recipient: {
      name: 'R1 private name',
      phone: '+84 912 345 678',
      address: 'R1 private street address'
    },
    note: 'R1 private note'
  });
  const form = (
    payload,
    uploadedPhoto = photo,
    uploadedPreview = png,
    photoType = 'image/jpeg'
  ) => {
    const result = new FormData();
    result.set('payload', JSON.stringify(payload));
    result.set(
      'photo_0',
      new Blob([uploadedPhoto], { type: photoType }),
      `photo.${photoType === 'image/png' ? 'png' : 'jpg'}`
    );
    result.set('preview_0', new Blob([uploadedPreview], { type: 'image/png' }), 'preview.png');
    return result;
  };

  let order;
  try {
    await start();
    await t.test('shared normalizer accepts common Vietnamese phone input formats', () => {
      for (const input of ['0912 345 678', '+84912345678', '84-912-345-678'])
        assert.equal(normalizePhone(input), photoNumber);
      assert.throws(() => normalizePhone('12345'));
      assert.equal(
        lookupPhoneHash(photoNumber, secret),
        createHmac('sha256', secret).update(photoNumber).digest('hex')
      );
    });

    await t.test('order response and database store only HMAC lookup data', async () => {
      const before = await count('orders');
      order = expect(await call('/api/orders', { body: form(orderPayload()) }), 201);
      namedSchema(order, 'OrderCreated');
      assert.equal(await count('orders'), before + 1);
      assert.match(order.orderNumber, /^HM-[0-9A-F]{16}$/);
      assert.ok(!('trackingToken' in order));
      const row = (
        await db.query('SELECT lookup_phone_hash,recipient_snapshot FROM orders WHERE id=?', [
          order.id
        ])
      ).rows[0];
      assert.equal(
        row.lookup_phone_hash,
        createHmac('sha256', secret).update(photoNumber).digest('hex')
      );
      assert.equal(row.recipient_snapshot.phone, photoNumber);
      const columns = await db.query(
        "SELECT column_name FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='orders'"
      );
      assert.ok(!columns.rows.some(column => column.column_name === 'tracking_token_hash'));
      assert.ok(!columns.rows.some(column => column.column_name === 'user_id'));
      assert.ok(!('trackingToken' in order));
    });

    await t.test(
      'photo uploads rotate EXIF, remove metadata, resize, and preserve preview pixels',
      async () => {
        assert.deepEqual(orientedPhotoSize(4000, 3000, 6), { width: 3000, height: 4000 });
        assert.deepEqual(imageSettings({}), { maxEdge: 2400, jpegQuality: 82 });
        assert.throws(() => imageSettings({ PHOTO_MAX_EDGE: '0' }), /PHOTO_MAX_EDGE/);

        const phonePhoto = await sharp(await texturedJpeg(4000, 3000))
          .withMetadata({ orientation: 6 })
          .withExif({
            IFD3: {
              GPSLatitudeRef: 'N',
              GPSLatitude: '10/1,20/1,30/1',
              GPSLongitudeRef: 'E',
              GPSLongitude: '106/1,40/1,50/1'
            }
          })
          .toBuffer();
        const originalMeta = await sharp(phonePhoto).metadata();
        assert.equal(originalMeta.orientation, 6);
        assert.ok(originalMeta.exif?.length);
        const phonePayload = orderPayload(3000, 4000);
        const phoneResponse = expect(
          await call('/api/orders', { body: form(phonePayload, phonePhoto) }),
          201
        );
        const phoneRow = (
          await db.query('SELECT photo_key,preview_key FROM order_items WHERE order_id=?', [
            phoneResponse.id
          ])
        ).rows[0];
        const storedPhonePhoto = await readFile(join(root, 'uploads', phoneRow.photo_key));
        const storedPhoneMeta = await sharp(storedPhonePhoto).metadata();
        assert.equal(storedPhoneMeta.format, 'jpeg');
        assert.deepEqual([storedPhoneMeta.width, storedPhoneMeta.height], [1800, 2400]);
        assert.equal(storedPhoneMeta.orientation, undefined);
        assert.equal(storedPhoneMeta.exif, undefined);
        assert.ok(storedPhonePhoto.length < 1024 * 1024);

        const screenshot = await sharp({
          create: { width: 1920, height: 1080, channels: 3, background: '#f0e6d2' }
        })
          .composite([
            {
              input: Buffer.from(
                '<svg width="1920" height="1080"><rect x="50" y="50" width="900" height="400" fill="#17365d"/><text x="100" y="250" font-size="80" fill="white">Harméa test</text></svg>'
              )
            }
          ])
          .png()
          .toBuffer();
        const screenshotPreview = await sharp({
          create: { width: 1024, height: 650, channels: 4, background: '#f7f4ec' }
        })
          .composite([
            {
              input: Buffer.from(
                '<svg width="1024" height="650"><rect x="100" y="120" width="500" height="300" fill="#9a5555"/></svg>'
              )
            }
          ])
          .png()
          .toBuffer();
        const screenshotResponse = expect(
          await call('/api/orders', {
            body: form(orderPayload(1920, 1080), screenshot, screenshotPreview, 'image/png')
          }),
          201
        );
        const screenshotRow = (
          await db.query('SELECT photo_key,preview_key FROM order_items WHERE order_id=?', [
            screenshotResponse.id
          ])
        ).rows[0];
        const storedScreenshot = await readFile(join(root, 'uploads', screenshotRow.photo_key));
        const screenshotMeta = await sharp(storedScreenshot).metadata();
        assert.equal(screenshotMeta.format, 'jpeg');
        assert.deepEqual([screenshotMeta.width, screenshotMeta.height], [1920, 1080]);
        const sourcePixels = await sharp(screenshotPreview).ensureAlpha().raw().toBuffer();
        const storedPreviewPixels = await sharp(join(root, 'uploads', screenshotRow.preview_key))
          .ensureAlpha()
          .raw()
          .toBuffer();
        assert.deepEqual(storedPreviewPixels, sourcePixels);

        const smallPhoto = await texturedJpeg(800, 600);
        const smallResponse = expect(
          await call('/api/orders', { body: form(orderPayload(800, 600), smallPhoto) }),
          201
        );
        const smallRow = (
          await db.query('SELECT photo_key FROM order_items WHERE order_id=?', [smallResponse.id])
        ).rows[0];
        const smallMeta = await sharp(join(root, 'uploads', smallRow.photo_key)).metadata();
        assert.deepEqual([smallMeta.width, smallMeta.height], [800, 600]);

        const filesBeforeMismatch = await readdir(join(root, 'uploads'));
        const mismatch = expect(
          await call('/api/orders', {
            body: form(orderPayload(4000, 3000), phonePhoto)
          }),
          422
        );
        assert.equal(
          mismatch.error.message,
          'Ảnh bị xoay khác với bản xem trước, hãy chọn lại ảnh'
        );
        assert.deepEqual(await readdir(join(root, 'uploads')), filesBeforeMismatch);

        console.log(
          'R2 image measurements',
          JSON.stringify({
            phone12MP: {
              inputBytes: phonePhoto.length,
              inputPx: '4000x3000',
              serverBytes: storedPhonePhoto.length,
              serverPx: '1800x2400'
            },
            screenshot: {
              inputBytes: screenshot.length,
              inputPx: '1920x1080',
              serverBytes: storedScreenshot.length,
              serverPx: `${screenshotMeta.width}x${screenshotMeta.height}`
            },
            small: {
              inputBytes: smallPhoto.length,
              inputPx: '800x600',
              serverBytes: (await readFile(join(root, 'uploads', smallRow.photo_key))).length,
              serverPx: '800x600'
            }
          })
        );
      }
    );

    await t.test(
      'lookup accepts normalized phones and returns only the public allowlist',
      async () => {
        const expectedKeys = [
          'createdAt',
          'history',
          'orderNumber',
          'status',
          'trackingCode',
          'updatedAt'
        ];
        for (const phone of ['0912 345 678', '+84912345678', '84-912-345-678']) {
          const result = expect(
            await call('/api/tracking/lookup', {
              body: lookupBody(` ${order.orderNumber.toLowerCase()} `, phone)
            }),
            200
          );
          namedSchema(result, 'PublicTracking');
          assert.deepEqual(Object.keys(result).sort(), expectedKeys);
          assert.equal(result.orderNumber, order.orderNumber);
          assert.equal(result.status, 'pending');
          const serialized = JSON.stringify(result);
          for (const privateValue of [
            'R1 private name',
            photoNumber,
            'private street address',
            'private-r1-url',
            'R1 private note'
          ])
            assert.ok(!serialized.includes(privateValue));
        }
      }
    );

    await t.test('lookup locks before phone matching and unlocks after the window', async () => {
      const unknownNumber = 'HM-ABCDEF0123456789';
      const failures = [
        await call('/api/tracking/lookup', {
          body: lookupBody(unknownNumber),
          ip: '198.51.100.10'
        }),
        await call('/api/tracking/lookup', {
          body: lookupBody('HM-INVALID'),
          ip: '198.51.100.11'
        }),
        await call('/api/tracking/lookup', {
          body: lookupBody(unknownNumber, 'invalid'),
          ip: '198.51.100.12'
        })
      ];
      for (const response of failures) expect(response, 404);
      assert.equal(new Set(failures.map(response => response.data.error.message)).size, 1);
      for (let i = 0; i < 5; i++)
        expect(
          await call('/api/tracking/lookup', {
            body: lookupBody(order.orderNumber, '0999 999 999'),
            ip: `198.51.100.${20 + i}`
          }),
          404
        );
      const correctWhileOrderLocked = await call('/api/tracking/lookup', {
        body: lookupBody(order.orderNumber),
        ip: '198.51.100.30'
      });
      expect(correctWhileOrderLocked, 429);
      assert.ok(Number.isInteger(Number(correctWhileOrderLocked.headers.get('retry-after'))));
      assert.ok(Number(correctWhileOrderLocked.headers.get('retry-after')) > 0);

      now += 15 * 60_000 + 1;
      assert.equal(
        expect(
          await call('/api/tracking/lookup', {
            body: lookupBody(order.orderNumber),
            ip: '198.51.100.31'
          }),
          200
        ).status,
        'pending'
      );

      const ip = '203.0.113.25';
      for (let i = 0; i < 20; i++)
        expect(
          await call('/api/tracking/lookup', {
            body: lookupBody(`HM-${i.toString(16).padStart(16, '0').toUpperCase()}`),
            ip
          }),
          404
        );
      const correctWhileIpLocked = await call('/api/tracking/lookup', {
        body: lookupBody(order.orderNumber),
        ip
      });
      expect(correctWhileIpLocked, 429);
      assert.ok(Number.isInteger(Number(correctWhileIpLocked.headers.get('retry-after'))));
      assert.ok(Number(correctWhileIpLocked.headers.get('retry-after')) > 0);
      now += 15 * 60_000 + 1;
      assert.equal(
        expect(
          await call('/api/tracking/lookup', {
            body: lookupBody(order.orderNumber),
            ip
          }),
          200
        ).status,
        'pending'
      );
    });

    await t.test(
      'admin defaults on in development, is fail-closed in production, and status actor is admin',
      async () => {
        assert.equal(expect(await call('/api/admin/orders'), 200).total, 4);
        const detail = expect(await call(`/api/admin/orders/${order.id}`), 200);
        const assetPath = detail.items[0].assets.preview;
        const asset = await call(assetPath);
        expect(asset, 200);
        assert.deepEqual(
          await sharp(asset.bytes).ensureAlpha().raw().toBuffer(),
          await sharp(png).ensureAlpha().raw().toBuffer()
        );

        await stop();
        process.env.NODE_ENV = 'production';
        delete process.env.ADMIN_ENABLED;
        await start();
        const hiddenApi = await call('/api/admin/orders');
        expect(hiddenApi, 404);
        assert.equal(hiddenApi.data.error.code, 'NOT_FOUND');
        assert.equal(hiddenApi.data.error.message, 'Không tìm thấy.');
        assert.equal((await call('/admin')).status, 404);
        expect(await call(assetPath), 404);

        process.env.ADMIN_ENABLED = 'true';
        await stop();
        const warnings = [];
        const originalWarn = console.warn;
        console.warn = message => warnings.push(String(message));
        try {
          await start();
        } finally {
          console.warn = originalWarn;
        }
        assert.ok(warnings.some(message => message.includes('reverse proxy')));
        expect(await call('/api/admin/orders'), 200);
        const updated = expect(
          await call(`/api/admin/orders/${order.id}/status`, {
            method: 'PATCH',
            body: { expectedVersion: 1, status: 'confirmed' }
          }),
          200
        );
        assert.equal(updated.history.at(-1).actor, 'admin');
        expect(
          await call(`/api/admin/orders/${order.id}/status`, {
            method: 'PATCH',
            body: { expectedVersion: 1, status: 'confirmed' }
          }),
          409
        );
        expect(
          await call(`/api/admin/orders/${order.id}/status`, {
            method: 'PATCH',
            body: { expectedVersion: 2, status: 'completed' }
          }),
          409
        );
        const current = expect(
          await call('/api/tracking/lookup', { body: lookupBody(order.orderNumber) }),
          200
        );
        assert.equal(current.status, 'confirmed');
        assert.equal(current.history.length, 2);
      }
    );

    await t.test(
      'backfill script restores a legacy order digest from the recipient snapshot',
      async () => {
        await db.exec(
          'ALTER TABLE orders MODIFY lookup_phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL'
        );
        const legacyId = randomUUID();
        await db.query(
          'INSERT INTO orders(id,order_number,request_key,product_id,product_snapshot,recipient_snapshot,quantity,unit_price_vnd,subtotal_vnd) VALUES(?,?,?,?,?,?,?,?,?)',
          [
            legacyId,
            `HM-${randomBytes(8).toString('hex').toUpperCase()}`,
            randomUUID(),
            productId,
            JSON.stringify({ name: 'Historical R1' }),
            JSON.stringify({
              name: 'Legacy test',
              phone: '+84 912 345 678',
              address: 'Legacy address only for test'
            }),
            1,
            50000,
            50000
          ]
        );
        const result = await run(process.execPath, ['scripts/backfill-lookup.mjs'], {
          cwd: process.cwd(),
          env: process.env,
          encoding: 'utf8'
        });
        assert.match(result.stdout, /Backfilled phone lookup hashes for 1 order/);
        const row = (await db.query('SELECT lookup_phone_hash FROM orders WHERE id=?', [legacyId]))
          .rows[0];
        assert.equal(
          row.lookup_phone_hash,
          createHmac('sha256', secret).update(photoNumber).digest('hex')
        );
        await db.exec(
          'ALTER TABLE orders MODIFY lookup_phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL'
        );
      }
    );

    await t.test('production startup refuses a missing lookup secret', async () => {
      await assert.rejects(
        run(process.execPath, ['-e', "import('./apps/api/src/server.ts')"], {
          cwd: process.cwd(),
          env: { ...process.env, NODE_ENV: 'production', LOOKUP_SECRET: '' },
          encoding: 'utf8'
        }),
        error => error.code !== 0 && /LOOKUP_SECRET is required/.test(error.stderr)
      );
    });
  } finally {
    await stop();
    await db.close();
    await testDatabase.destroy();
    await rm(root, { recursive: true, force: true });
    const restore = (key, value) =>
      value === undefined ? delete process.env[key] : (process.env[key] = value);
    restore('UPLOAD_DIR', previous.uploadDir);
    restore('APP_URL', previous.appUrl);
    restore('LOOKUP_SECRET', previous.lookupSecret);
    restore('NODE_ENV', previous.nodeEnv);
    restore('ADMIN_ENABLED', previous.adminEnabled);
    restore('PHOTO_MAX_EDGE', previous.photoMaxEdge);
    restore('PHOTO_JPEG_QUALITY', previous.photoJpegQuality);
  }
});

test('MySQL keeps each design in order_items and has no auth schema', async t => {
  const testDatabase = await createTestDatabase(t);
  const db = await openDatabase();
  try {
    const columns = await db.query(
      `SELECT TABLE_NAME AS tableName,COLUMN_NAME AS columnName FROM information_schema.columns
       WHERE table_schema=DATABASE() AND table_name IN ('orders','order_status_events')`
    );
    const names = columns.rows.map(row => `${row.tableName}.${row.columnName}`);
    for (const name of [
      'orders.user_id',
      'orders.tracking_token_hash',
      'order_status_events.actor_user_id'
    ])
      assert.ok(!names.includes(name));
    const tables = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN ('users','sessions','admin_sessions')"
    );
    assert.deepEqual(tables.rows, []);
    assert.ok(names.includes('orders.lookup_phone_hash'));
  } finally {
    await db.close();
    await testDatabase.destroy();
  }
});
