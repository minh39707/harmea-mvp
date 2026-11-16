// Run only against the disposable local H stack, never a live database.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';

assert.equal(process.env.HARMEA_H_ACCEPTANCE, 'true');
const base = 'http://127.0.0.1:3187';
const container = 'harmea-h-20261111-app';
const docker = args => execFileSync('docker', args, { encoding: 'utf8' }).trim();
const [runtime] = JSON.parse(docker(['inspect', container]));
assert.equal(runtime.Config.Labels['com.docker.compose.project'], 'harmea-h-20261111');
assert.equal(runtime.NetworkSettings.Ports['3000/tcp'][0].HostIp, '127.0.0.1');
assert.equal(runtime.NetworkSettings.Ports['3000/tcp'][0].HostPort, '3187');
const expectedDigest = 'sha256:eb683458f154e5209bf2a6a7100de8bbd7481fe5391079f24549a0b49c5fd035';
const [image] = JSON.parse(docker(['image', 'inspect', runtime.Image]));
assert.ok(image.RepoDigests.some(ref => ref.endsWith('@' + expectedDigest)));
assert.equal(image.Config.User, 'node');
assert.equal(image.Architecture, 'amd64');
const report = {
  image: 'hainam164/harmea-web:v1',
  digest: expectedDigest,
  imageBytes: image.Size,
  checks: [],
  failures: [],
  resourceSamples: []
};
const check = name => report.checks.push({ name, result: 'PASS' });
const request = async (path, status = 200, init) => {
  const response = await fetch(base + path, init);
  assert.equal(response.status, status, path);
  assert.equal(response.headers.get('set-cookie'), null, path);
  return response;
};
const json = async (path, status = 200, init) => (await request(path, status, init)).json();
const send = (body, method = 'POST') => ({
  method,
  headers: { 'Content-Type': 'application/json', Origin: base },
  body: JSON.stringify(body)
});
const connections = () =>
  JSON.parse(
    docker([
      'exec',
      container,
      'node',
      '--input-type=module',
      '-e',
      "import {openDatabase} from './apps/api/src/db.ts';const db=await openDatabase();try{console.log(JSON.stringify((await db.query('SELECT COMMAND, COUNT(*) AS count FROM information_schema.PROCESSLIST WHERE DB=DATABASE() GROUP BY COMMAND')).rows));}finally{await db.close();}"
    ])
  );
const sample = label =>
  report.resourceSamples.push({
    label,
    stats: docker([
      'stats',
      '--no-stream',
      '--format',
      '{{json .}}',
      container,
      'harmea-h-20261111-db-1'
    ])
      .split('\n')
      .map(line => JSON.parse(line))
  });

await request('/ready');
for (const path of [
  '/',
  '/design',
  '/cart',
  '/checkout',
  '/track',
  '/faq',
  '/shipping',
  '/returns',
  '/privacy'
]) {
  const response = await request(path);
  if (!response.headers.get('content-security-policy'))
    report.failures.push({ path, issue: 'Missing Content-Security-Policy on released v1' });
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('referrer-policy'));
}
for (const path of ['/storage/uploads/private.jpg', '/assets/missing.js', '/fonts/missing.woff2'])
  await request(path, 404);
await request('/api/tracking/lookup', 403, {
  ...send({}),
  headers: { 'Content-Type': 'application/json', Origin: 'https://foreign.invalid' }
});
check(
  'nosniff/referrer headers, no cookies, private files, missing assets, foreign Origin rejected'
);
const photo = await sharp({ create: { width: 600, height: 900, channels: 3, background: '#abc' } })
  .jpeg()
  .toBuffer();
const preview = await sharp(photo).png().toBuffer();
const originalProduct = (await json('/api/admin/products'))[0];
assert.equal(
  (await json('/api/admin/orders')).total,
  0,
  'Use a fresh disposable H stack before running the 20-order scenario.'
);
const makeOrder = async (status = 201) => {
  const form = new FormData();
  form.set(
    'payload',
    JSON.stringify({
      requestKey: randomUUID(),
      designConfirmed: true,
      recipient: { name: 'Khách thử H', phone: '0900000000', address: 'Địa chỉ giả nghiệm thu H' },
      items: [
        {
          productId: originalProduct.id,
          templateVersion: originalProduct.templateVersion,
          quantity: 1,
          design: {
            fullName: 'Nguyễn Thử H',
            musicUrl: 'https://open.spotify.com/track/harmea-h-fixture',
            color: 'cream',
            crop: { x: 0, y: 0, width: 1, height: 1 },
            photoWidth: 600,
            photoHeight: 900
          }
        }
      ]
    })
  );
  form.set('photo_0', new Blob([photo], { type: 'image/jpeg' }), 'photo.jpg');
  form.set('preview_0', new Blob([preview], { type: 'image/png' }), 'preview.png');
  return json('/api/orders', status, { method: 'POST', headers: { Origin: base }, body: form });
};
report.connectionsBefore = connections();
sample('before 20 orders');
const receipts = [];
const durations = [];
for (let i = 0; i < 20; i++) {
  const start = performance.now();
  receipts.push(await makeOrder());
  durations.push(Math.round(performance.now() - start));
  if (i === 9) sample('after 10 orders');
}
report.connectionsAfter = connections();
sample('after 20 orders');
report.orders = {
  count: receipts.length,
  durationMs: durations,
  inputPhotoBytes: photo.length,
  inputPreviewBytes: preview.length
};
assert.equal(new Set(receipts.map(r => r.id)).size, 20);
// This includes the short-lived observer connection; the app pool remains bounded at ten.
assert.ok(report.connectionsAfter.reduce((n, row) => n + Number(row.count), 0) <= 11);
check('20 sequential orders: distinct receipts, HTTP 201, bounded database connections');
const receipt = receipts[0];
let detail = await json(`/api/admin/orders/${receipt.id}`);
for (const [kind, path] of Object.entries(detail.items[0].assets)) {
  const bytes = Buffer.from(await (await request(path)).arrayBuffer());
  assert.equal((await sharp(bytes).metadata()).format, kind === 'photo' ? 'jpeg' : 'png');
}
for (const phone of ['0900 000 000', '+84900000000', '84-900-000-000']) {
  const tracked = await json(
    '/api/tracking/lookup',
    200,
    send({ orderNumber: receipt.orderNumber, phone })
  );
  assert.deepEqual(Object.keys(tracked).sort(), [
    'createdAt',
    'history',
    'orderNumber',
    'status',
    'trackingCode',
    'updatedAt'
  ]);
}
check('private original/preview decode, phone normalization and tracking response allowlist');
const updated = await json(
  `/api/admin/orders/${receipt.id}/status`,
  200,
  send({ expectedVersion: detail.version, status: 'confirmed' }, 'PATCH')
);
assert.equal(updated.status, 'confirmed');
await request(
  `/api/admin/orders/${receipt.id}/status`,
  409,
  send({ expectedVersion: detail.version, status: 'confirmed' }, 'PATCH')
);
detail = await json(`/api/admin/orders/${receipt.id}`);
assert.equal(detail.history.length, 2);
const second = receipts[1];
await request(
  `/api/admin/orders/${second.id}/status`,
  422,
  send({ expectedVersion: 1, status: 'cancelled' }, 'PATCH')
);
await request(
  `/api/admin/orders/${second.id}/status`,
  200,
  send(
    { expectedVersion: 1, status: 'cancelled', cancellationReason: 'Lý do giả H, chỉ nội bộ' },
    'PATCH'
  )
);
const publicCancelled = await json(
  '/api/tracking/lookup',
  200,
  send({ orderNumber: second.orderNumber, phone: '0900000000' })
);
assert.ok(!JSON.stringify(publicCancelled).includes('Lý do giả'));
check('status transition, stale version 409, history, cancellation requires private reason');
const filtered = await json(`/api/admin/orders?orderNumber=${receipt.orderNumber}`);
assert.equal(filtered.total, 1);
assert.equal(filtered.items[0].id, receipt.id);
const page = await json('/api/admin/orders?page=2&pageSize=5');
assert.equal(page.items.length, 5);
const stats = await json('/api/admin/stats');
assert.equal(stats.cardCount, 19);
assert.equal(stats.subtotalVnd, 19 * originalProduct.unitPriceVnd);
check('admin search, pagination and stats match 20 orders including one cancellation');
let changed = await json(
  `/api/admin/products/${originalProduct.id}`,
  200,
  send(
    { expectedVersion: originalProduct.version, unitPriceVnd: originalProduct.unitPriceVnd + 1000 },
    'PATCH'
  )
);
assert.equal(
  (await json(`/api/admin/orders/${receipt.id}`)).unitPriceVnd,
  originalProduct.unitPriceVnd
);
assert.equal((await makeOrder()).unitPriceVnd, originalProduct.unitPriceVnd + 1000);
changed = await json(
  `/api/admin/products/${originalProduct.id}`,
  200,
  send({ expectedVersion: changed.version, isActive: false }, 'PATCH')
);
assert.equal((await makeOrder(409)).error.code, 'PRODUCT_INACTIVE');
await json(
  `/api/admin/products/${originalProduct.id}`,
  200,
  send(
    {
      expectedVersion: changed.version,
      isActive: true,
      unitPriceVnd: originalProduct.unitPriceVnd
    },
    'PATCH'
  )
);
check(
  'price snapshot retained, new price applied, inactive product blocks new order, product restored'
);
const csv = Buffer.from(await (await request('/api/admin/orders.csv')).arrayBuffer());
assert.equal(csv.subarray(0, 3).toString('hex'), 'efbbbf');
assert.ok(csv.toString('utf8').includes('Khách thử H'));
assert.ok(!csv.toString('utf8').includes('open.spotify.com'));
check('CSV UTF-8 BOM and Vietnamese fixture retained; music URL omitted (Excel not tested)');
for (let i = 0; i < 5; i++)
  await request(
    '/api/tracking/lookup',
    404,
    send({ orderNumber: receipt.orderNumber, phone: '0911111111' })
  );
const locked = await request(
  '/api/tracking/lookup',
  429,
  send({ orderNumber: receipt.orderNumber, phone: '0900000000' })
);
assert.ok(Number(locked.headers.get('retry-after')) > 0);
check('five wrong lookups then correct phone gets 429 with Retry-After on released image');
const logs = docker(['logs', container]);
for (const sensitive of [
  '0900000000',
  '0911111111',
  'Khách thử H',
  'Địa chỉ giả nghiệm thu H',
  'open.spotify.com',
  'Lý do giả H'
])
  assert.ok(!logs.includes(sensitive));
check('container logs omit synthetic phone, recipient, address, music URL and cancellation reason');
report.checkedAt = new Date().toISOString();
await writeFile(process.argv[2], JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
