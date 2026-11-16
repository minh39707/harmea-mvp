// Piped into the isolated smoke container; never included in the runtime image.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

if (process.env.HARMEA_DOCKER_SMOKE !== 'true')
  throw new Error('This fixture only runs in an isolated Docker smoke container.');
const mode = process.argv[2];
assert.ok(['create', 'verify', 'gate'].includes(mode));
const endpoint = new URL(process.env.DOCKER_SMOKE_BASE_URL ?? 'http://127.0.0.1:3000');
assert.ok(
  endpoint.protocol === 'http:' &&
    ['127.0.0.1', 'localhost', '[::1]'].includes(endpoint.hostname) &&
    endpoint.pathname === '/' &&
    !endpoint.username &&
    !endpoint.password &&
    !endpoint.search &&
    !endpoint.hash,
  'Docker fixtures require a loopback HTTP API.'
);
const base = endpoint.origin;
const recordPath = process.env.DOCKER_SMOKE_RECORD_PATH ?? '/app/storage/docker-smoke.json';
const phone = '0900000000';
const request = async (path, status = 200, init) => {
  const response = await fetch(base + path, init);
  assert.equal(response.status, status, 'Unexpected Docker fixture HTTP status.');
  assert.equal(response.headers.get('set-cookie'), null);
  return response;
};
const json = async (path, status = 200, init) => (await request(path, status, init)).json();
const post = body => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const imageHashes = async paths => {
  const result = {};
  for (const [kind, path] of Object.entries(paths)) {
    const response = await request(path);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.match(response.headers.get('content-disposition'), /^attachment;/);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal((await sharp(bytes).metadata()).format, kind === 'photo' ? 'jpeg' : 'png');
    result[kind] = hash(bytes);
  }
  return result;
};

await request('/health');
await request('/ready');
if (mode === 'create') {
  await request('/admin');
  const product = await json('/api/products/current');
  const photo = await sharp({ create: { width: 40, height: 60, channels: 3, background: '#abc' } })
    .jpeg()
    .toBuffer();
  const preview = await sharp(photo).png().toBuffer();
  const form = new FormData();
  form.set(
    'payload',
    JSON.stringify({
      requestKey: randomUUID(),
      designConfirmed: true,
      recipient: { name: 'Docker smoke recipient', phone, address: 'Docker smoke address' },
      items: [
        {
          productId: product.id,
          templateVersion: product.templateVersion,
          quantity: 2,
          design: {
            fullName: 'Docker smoke fixture',
            musicUrl: 'https://open.spotify.com/track/docker-smoke-fixture',
            color: 'cream',
            crop: { x: 0, y: 0, width: 1, height: 1 }
          }
        }
      ]
    })
  );
  form.set('photo_0', new Blob([photo], { type: 'image/jpeg' }), 'photo.jpg');
  form.set('preview_0', new Blob([preview], { type: 'image/png' }), 'preview.png');
  const receipt = await json('/api/orders', 201, { method: 'POST', body: form });
  const detail = await json(`/api/admin/orders/${receipt.id}`);
  const paths = detail.items[0].assets;
  const hashes = await imageHashes(paths);
  const changed = await json(`/api/admin/orders/${receipt.id}/status`, 200, {
    ...post({ expectedVersion: detail.version, status: 'confirmed' }),
    method: 'PATCH'
  });
  assert.equal(changed.status, 'confirmed');
  await writeFile(
    recordPath,
    JSON.stringify({ id: receipt.id, orderNumber: receipt.orderNumber, paths, hashes }),
    { mode: 0o600 }
  );
}
const record = JSON.parse(await readFile(recordPath, 'utf8'));
if (mode === 'gate') {
  for (const path of [
    '/admin',
    '/api/admin/orders',
    `/api/admin/orders/${record.id}`,
    ...Object.values(record.paths)
  ])
    await request(path, 404);
} else {
  const tracked = await json(
    '/api/tracking/lookup',
    200,
    post({ orderNumber: record.orderNumber, phone })
  );
  assert.equal(tracked.status, 'confirmed');
  assert.deepEqual(Object.keys(tracked).sort(), [
    'createdAt',
    'history',
    'orderNumber',
    'status',
    'trackingCode',
    'updatedAt'
  ]);
  const detail = await json(`/api/admin/orders/${record.id}`);
  assert.equal(detail.version, 2);
  assert.equal(detail.history.length, 2);
  assert.deepEqual(await imageHashes(record.paths), record.hashes);
  await request('/storage/uploads/not-public.jpg', 404);
}
console.log(`Docker fixture ${mode}: PASS.`);
