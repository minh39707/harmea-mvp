// Run from repository root: node scripts/qa-smoke.mjs
// Uses an isolated temporary PGlite database; never reads customer data or secrets.
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { openDatabase } from '../apps/api/src/db.ts';
import { createApp } from '../apps/api/src/app.ts';

process.env.DB_DRIVER = 'pglite';
process.env.DATA_DIR = await mkdtemp(join(tmpdir(), 'harmea-qa-'));
let db = await openDatabase();
for (const name of (await readdir('database')).filter(n => /^\d+.*\.sql$/.test(n)).sort()) {
  await db.exec(await readFile(join('database', name), 'utf8'));
}
let server, base;
const evidence = [];
async function start() {
  server = createApp(db, 'isolated-qa-secret').listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() { await new Promise(resolve => server.close(resolve)); }
async function call(path, body, method = body === undefined ? 'GET' : 'POST', headers = {}) {
  const r = await fetch(base + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const raw = await r.text();
  let data; try { data = JSON.parse(raw); } catch { data = { contentType: r.headers.get('content-type') }; }
  return { status: r.status, data };
}
function record(name, actual, expected, details = {}) {
  evidence.push({ name, actual, expected, pass: actual === expected, ...details });
}
await start();
try {
  const product = await call('/api/products/current');
  record('catalog HTTP', product.status, 200);
  const contract = JSON.parse(await readFile('contracts/openapi.json', 'utf8'));
  const schema = contract.components.schemas.Product;
  const missing = schema.required.filter(k => !(k in product.data));
  const extra = Object.keys(product.data).filter(k => !(k in schema.properties));
  record('catalog contract fields', missing.length + extra.length, 0, { missing, extra });
  const make = () => ({ requestKey: randomUUID(), confirmed: true, items: [{ productId: product.data.id, quantity: 2, design: { fullName: 'QA Tiếng Việt', signatureText: 'QA', place: 'Địa điểm giả', dateOfBirth: '2003-01-01', commemorativeDate: '2026-10-29', musicUrl: 'https://open.spotify.com/track/qa', color: 'cream', photo: '' } }], recipient: { name: 'QA giả lập', phone: '0900000000', address: 'Địa chỉ giả dùng kiểm thử', note: 'Không giao hàng' } });
  const payload = make();
  const created = await call('/api/demo-checkouts', payload);
  record('create demo checkout', created.status, 201);
  record('server calculated subtotal', created.data.subtotalVnd, product.data.unitPriceVnd * 2);
  const tracked = await call('/api/demo-tracking', { token: created.data.trackingToken });
  record('track created checkout', tracked.status, 200);
  const allowed = ['orderNumber', 'status', 'subtotalVnd', 'shippingFeeVnd', 'isTest', 'createdAt'];
  record('tracking private field leakage', Object.keys(tracked.data).filter(k => !allowed.includes(k)).length, 0);
  record('invalid tracking token', (await call('/api/demo-tracking', { token: 'x'.repeat(43) })).status, 404);
  const replay = await call('/api/demo-checkouts', payload);
  record('duplicate request per P0 contract', replay.status, 409, { sameOrder: replay.data.orderNumber === created.data.orderNumber, tokenReturnedAgain: !!replay.data.trackingToken });
  const changed = structuredClone(payload); changed.recipient.name = 'Khác';
  record('same key different payload', (await call('/api/demo-checkouts', changed)).status, 409);
  for (const [name, change, status] of [
    ['missing confirmation', b => b.confirmed = false, 422],
    ['quantity 11', b => b.items[0].quantity = 11, 422],
    ['invalid phone', b => b.recipient.phone = 'abc', 422],
    ['future DOB', b => b.items[0].design.dateOfBirth = '2099-01-01', 422],
    ['nonexistent date', b => b.items[0].design.dateOfBirth = '2026-02-30', 422],
    ['javascript URL', b => b.items[0].design.musicUrl = 'javascript:alert(1)', 422],
    ['host suffix attack', b => b.items[0].design.musicUrl = 'https://open.spotify.com.evil.example/song', 422],
    ['fake PNG', b => b.items[0].design.photo = 'data:image/png;base64,aGVsbG8=', 422],
    ['invalid product UUID', b => b.items[0].productId = 'invalid', 422],
  ]) {
    const b = make(); change(b);
    const r = await call('/api/demo-checkouts', b);
    record(name, r.status, status, r.status === status ? {} : { errorCode: r.data.error?.code });
  }
  const photo = make();
  photo.items[0].design.photo = 'data:image/png;base64,' + (await sharp({ create: { width: 100, height: 80, channels: 3, background: '#abd' } }).png().toBuffer()).toString('base64');
  record('real PNG accepted', (await call('/api/demo-checkouts', photo)).status, 201);
  const forged = make(); forged.subtotalVnd = 1; forged.items[0].unitPriceVnd = 1;
  record('client cannot set price', (await call('/api/demo-checkouts', forged)).data.subtotalVnd, product.data.unitPriceVnd * 2);
  record('foreign browser origin denied', (await call('/api/demo-checkouts', make(), 'POST', { Origin: 'https://evil.example' })).status, 403);
  record('contract create endpoint exists', (await call('/api/orders', {})).status, 422);
  record('contract lookup endpoint resolves valid token', (await call('/api/tracking/lookup', { token: created.data.trackingToken })).status, 200);
  const login = await call('/api/admin/session', {});
  record('admin session implemented', login.status, 422, { errorCode: login.data.error?.code });
  record('admin orders requires authentication', (await call('/api/admin/orders')).status, 401);
  record('admin login page served', (await call('/admin/login')).status, 200);
  const concurrent = make();
  const pair = await Promise.all([call('/api/demo-checkouts', concurrent), call('/api/demo-checkouts', concurrent)]);
  const count = await db.query('SELECT count(*)::int AS n FROM demo_checkouts WHERE request_key=$1', [concurrent.requestKey]);
  record('concurrent requests create only one row', count.rows[0].n, 1, { statuses: pair.map(r => r.status) });
  const saved = await db.query('SELECT items FROM demo_checkouts WHERE order_number=$1', [created.data.orderNumber]);
  record('snapshot retains design', saved.rows[0].items[0].design.fullName, payload.items[0].design.fullName);
  record('snapshot has preview PNG', 'preview' in saved.rows[0].items[0].design, true);
  await stop(); await db.close(); db = await openDatabase(); await start();
  record('tracking survives server and DB reopen', (await call('/api/demo-tracking', { token: created.data.trackingToken })).status, 200);
} finally { await stop(); await db.close(); }
await writeFile('docs/qa-evidence-2026-10-29.json', JSON.stringify({ date: '2026-10-29', environment: { node: process.version, database: 'isolated disk PGlite', source: 'working tree, including pre-existing commerce.ts edit' }, checks: evidence }, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
console.log(`Checks: ${evidence.length}; matched expectations: ${evidence.filter(e => e.pass).length}; mismatches: ${evidence.filter(e => !e.pass).length}`);
