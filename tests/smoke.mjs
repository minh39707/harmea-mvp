// Canonical API smoke: health, catalog, multipart order, tracking, and retired routes.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../apps/api/src/app.ts';
import { openDatabase } from '../apps/api/src/db.ts';

const root = await mkdtemp(join(tmpdir(), 'harmea-smoke-'));
process.env.DB_DRIVER = 'pglite';
process.env.DATA_DIR = join(root, 'db');
process.env.UPLOAD_DIR = join(root, 'uploads');
let db, server;
const checks = [];
const check = (name, run) => {
  run();
  checks.push(name);
};

try {
  db = await openDatabase();
  for (const file of (await readdir('database')).filter(n => /^\d+.*\.sql$/.test(n)).sort())
    await db.exec(await readFile(join('database', file), 'utf8'));

  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, init) => {
    const response = await fetch(`${base}${path}`, init);
    return { response, data: await response.json() };
  };

  const health = await request('/api/health');
  check('health endpoint', () => {
    assert.equal(health.response.status, 200);
    assert.equal(health.data.status, 'ok');
  });

  const product = await request('/api/products/current');
  check('canonical product endpoint', () => {
    assert.equal(product.response.status, 200);
    assert.equal(typeof product.data.id, 'string');
    assert.equal(product.data.currency, 'VND');
  });

  const photo = await sharp({
    create: { width: 60, height: 90, channels: 3, background: '#abc' }
  }).jpeg().toBuffer();
  const preview = await sharp({
    create: { width: 60, height: 90, channels: 3, background: '#def' }
  }).png().toBuffer();
  const payload = {
    requestKey: randomUUID(),
    designConfirmed: true,
    items: [
      {
        productId: product.data.id,
        templateVersion: product.data.templateVersion,
        quantity: 2,
        design: {
          fullName: 'Smoke Harméa',
          musicUrl: 'https://open.spotify.com/track/smoke',
          color: 'cream',
          crop: { x: 0, y: 0, width: 1, height: 1 }
        }
      }
    ],
    recipient: { name: 'Khách thử', phone: '0900000000', address: 'Địa chỉ hư cấu để thử' },
    note: 'Smoke test only'
  };
  const form = new FormData();
  form.set('payload', JSON.stringify(payload));
  form.set('photo_0', new Blob([photo], { type: 'image/jpeg' }), 'photo.jpg');
  form.set('preview_0', new Blob([preview], { type: 'image/png' }), 'preview.png');
  const order = await request('/api/orders', { method: 'POST', body: form });
  check('canonical multipart order creation', () => {
    assert.equal(order.response.status, 201, JSON.stringify(order.data));
    assert.equal(order.data.quantity, 2);
    assert.equal(order.data.unitPriceVnd, product.data.unitPriceVnd);
    assert.equal(order.data.subtotalVnd, product.data.unitPriceVnd * 2);
    assert.match(order.data.trackingToken, /^[A-Za-z0-9_-]{43}$/);
  });

  const tracking = await request('/api/tracking/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: order.data.trackingToken })
  });
  check('canonical private tracking lookup', () => {
    assert.equal(tracking.response.status, 200);
    assert.equal(tracking.data.orderNumber, order.data.orderNumber);
    assert.equal(tracking.data.status, 'pending');
    assert.deepEqual(Object.keys(tracking.data).sort(), [
      'createdAt', 'history', 'orderNumber', 'status', 'trackingCode', 'updatedAt'
    ]);
  });

  const retiredPaths = [
    ['demo', 'checkouts'],
    ['demo', 'tracking']
  ].map(parts => `/api/${parts.join('-')}`);
  for (const path of retiredPaths) {
    const retired = await request(path);
    check(`retired route ${path}`, () => {
      assert.equal(retired.response.status, 404);
      assert.equal(retired.data.error.code, 'NOT_FOUND');
    });
  }

  const contract = JSON.parse(await readFile('contracts/openapi.json', 'utf8'));
  check('retired paths absent from OpenAPI', () => {
    assert.ok(!retiredPaths.some(path => path in contract.paths));
    assert.ok(!('LegacyReceipt' in contract.components.schemas));
  });
  assert.equal((await db.query('SELECT id FROM orders')).rows.length, 1);
  assert.equal((await db.query('SELECT id FROM order_items')).rows.length, 1);
  checks.push('canonical order persisted');
  console.log(`Canonical smoke: ${checks.length} checks passed.`);
  for (const name of checks) console.log(`- ${name}`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (db) await db.close();
  await rm(root, { recursive: true, force: true });
}
