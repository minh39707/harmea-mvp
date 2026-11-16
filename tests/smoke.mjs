// Canonical API smoke: health, catalog, multipart order, tracking, and retired routes.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { createApp } from '../apps/api/src/app.ts';
import { openDatabase } from '../apps/api/src/db.ts';
import { createTestDatabase } from './helpers/db.mjs';
import { validateNamedSchema } from './helpers/contract.mjs';

const testDatabase = await createTestDatabase();
const schemaContract = JSON.parse(await readFile('contracts/openapi.json', 'utf8'));
const namedSchema = (value, name) => validateNamedSchema(value, name, schemaContract);
const root = await mkdtemp(join(tmpdir(), 'harmea-smoke-'));
process.env.UPLOAD_DIR = join(root, 'uploads');
let db, server;
const checks = [];
const originalAppUrl = process.env.APP_URL;
process.env.APP_URL = 'https://harmea.example.test';
const check = (name, run) => {
  run();
  checks.push(name);
};

try {
  db = await openDatabase();

  server = createApp(db).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = async (path, init) => {
    const response = await fetch(`${base}${path}`, init);
    return { response, data: await response.json() };
  };

  for (const path of [
    '/',
    '/design',
    '/product',
    '/cart',
    '/checkout',
    '/track',
    '/about',
    '/how-nfc-works',
    '/faq',
    '/policies/shipping',
    '/policies/returns',
    '/policies/privacy',
    '/contact',
    '/some/deep/path',
    '/some.dotted/route',
    '/admin/products',
    '/admin/stats'
  ]) {
    const page = await fetch(`${base}${path}`);
    check(`SPA page route ${path}`, () => {
      assert.equal(page.status, 200);
      assert.match(page.headers.get('content-type') ?? '', /text\/html/);
    });
  }

  const trackPageHtml = await (await fetch(`${base}/track`)).text();
  check('tracking HTML starts with no-referrer policy', () => {
    assert.match(trackPageHtml, /<meta name="referrer" content="no-referrer"\s*\/>/);
  });

  const robots = await fetch(`${base}/robots.txt`);
  const robotsText = await robots.text();
  check('robots.txt uses runtime APP_URL and excludes private pages', () => {
    assert.equal(robots.status, 200);
    assert.match(robotsText, /Sitemap: https:\/\/harmea\.example\.test\/sitemap\.xml/);
    for (const path of ['/admin', '/track', '/checkout', '/cart'])
      assert.match(robotsText, new RegExp(`Disallow: ${path.replaceAll('/', '\\/')}`));
  });

  const previousAppUrl = process.env.APP_URL;
  const previousAppOrigin = process.env.APP_ORIGIN;
  const previousNodeEnv = process.env.NODE_ENV;
  let unconfiguredSeoServer;
  try {
    delete process.env.APP_URL;
    delete process.env.APP_ORIGIN;
    process.env.NODE_ENV = 'production';
    unconfiguredSeoServer = createApp().listen(0, '127.0.0.1');
    await new Promise(resolve => unconfiguredSeoServer.once('listening', resolve));
    const missingAppUrl = await fetch(
      `http://127.0.0.1:${unconfiguredSeoServer.address().port}/robots.txt`
    );
    check('production CSP restricts scripts/connections and supports local photo previews', () => {
      const policy = missingAppUrl.headers.get('content-security-policy') ?? '';
      for (const directive of [
        "default-src 'self'",
        "script-src 'self'",
        "connect-src 'self'",
        "media-src 'self'",
        "img-src 'self' data: blob:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'none'",
        "form-action 'self'"
      ])
        assert.ok(policy.split('; ').includes(directive));
      assert.equal(missingAppUrl.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(missingAppUrl.headers.get('referrer-policy'), 'no-referrer');
    });
    check('production SEO endpoints require configured APP_URL', () => {
      assert.equal(missingAppUrl.status, 500);
    });
  } finally {
    if (unconfiguredSeoServer) await new Promise(resolve => unconfiguredSeoServer.close(resolve));
    if (previousAppUrl === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previousAppUrl;
    if (previousAppOrigin === undefined) delete process.env.APP_ORIGIN;
    else process.env.APP_ORIGIN = previousAppOrigin;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }

  const sitemap = await fetch(`${base}/sitemap.xml`);
  const sitemapText = await sitemap.text();
  check('sitemap uses runtime APP_URL and contains public routes only', () => {
    assert.equal(sitemap.status, 200);
    assert.match(sitemapText, /https:\/\/harmea\.example\.test\/faq/);
    for (const path of ['/admin', '/track', '/checkout', '/cart'])
      assert.ok(!sitemapText.includes(`https://harmea.example.test${path}`));
  });

  const live = await fetch(`${base}/health`);
  const liveBody = await live.json();
  check('GET /health is a live check independent of database readiness', () => {
    assert.equal(live.status, 200);
    assert.deepEqual(liveBody, { status: 'ok' });
    namedSchema(liveBody, 'Liveness');
  });
  const ready = await fetch(`${base}/ready`);
  const readyBody = await ready.json();
  check('GET /ready checks MySQL and upload write access', () => {
    assert.equal(ready.status, 200);
    assert.deepEqual(readyBody, { status: 'ok' });
    namedSchema(readyBody, 'Readiness');
  });
  const apiHealth = await fetch(`${base}/api/health`);
  check('/api/health remains available', () => {
    assert.equal(apiHealth.status, 200);
    assert.doesNotMatch(apiHealth.headers.get('content-type') ?? '', /text\/html/);
  });

  const privateUpload = await fetch(`${base}/storage/uploads/private-file.jpg`);
  check('private upload paths are not made public by SPA fallback', () => {
    assert.equal(privateUpload.status, 404);
  });

  for (const path of [
    '/assets/missing.js',
    '/assets/missing.css',
    '/images/missing.png',
    '/fonts/missing.woff2',
    '/missing.ico',
    '/other/missing.json',
    '/assets/missing%2Ejs',
    '/missing.js/',
    '/.env',
    '/assets/no-extension'
  ]) {
    for (const method of ['GET', 'HEAD']) {
      const missing = await fetch(`${base}${path}`, { method });
      const body = await missing.text();
      check(`${method} missing static resource ${path} returns 404`, () => {
        assert.equal(missing.status, 404);
        assert.doesNotMatch(body, /id="root"/);
        assert.doesNotMatch(missing.headers.get('content-type') ?? '', /text\/html/);
        if (method === 'HEAD') assert.equal(body, '');
      });
    }
  }

  const unknownApi = await fetch(`${base}/api/khong-co`);
  const unknownApiBody = await unknownApi.json();
  check('unknown API route remains JSON 404', () => {
    assert.equal(unknownApi.status, 404);
    assert.equal(unknownApiBody.error.code, 'NOT_FOUND');
  });

  const indexHtml = await fetch(`${base}/index.html`);
  const indexMarkup = await indexHtml.text();
  const faviconTag = indexMarkup.match(/<link\b(?=[^>]*\brel="icon")[^>]*>/i)?.[0];
  const faviconPath = faviconTag?.match(/\bhref="([^"]+)"/)?.[1];
  check('index.html is not cached', () => {
    assert.equal(indexHtml.status, 200);
    assert.equal(indexHtml.headers.get('cache-control'), 'no-cache');
  });
  check('index.html has Vietnamese locale, favicon and social metadata', () => {
    assert.match(indexMarkup, /<html lang="vi">/);
    assert.ok(faviconPath, 'index.html must declare a favicon.');
    assert.match(faviconPath, /^\/(?!\/)/, 'Favicon must use a path on the app origin.');
    assert.match(indexMarkup, /property="og:image" content="\/images\/brand-emblem\.png"/);
    assert.match(indexMarkup, /name="twitter:card" content="summary_large_image"/);
    assert.match(indexMarkup, /name="twitter:image" content="\/images\/brand-emblem\.png"/);
  });
  const favicon = await fetch(`${base}${faviconPath}`);
  const faviconBytes = Buffer.from(await favicon.arrayBuffer());
  const faviconMetadata = await sharp(faviconBytes).metadata();
  check('declared favicon is served as a real image', () => {
    assert.equal(favicon.status, 200);
    assert.match(favicon.headers.get('content-type') ?? '', /^image\//);
    assert.ok(faviconMetadata.width > 0 && faviconMetadata.height > 0);
  });

  const assets = await readdir('apps/web/dist/assets');
  const hashedAsset = assets.find(name => /-[A-Za-z0-9_-]{8,}\.[A-Za-z0-9]+$/.test(name));
  assert.ok(hashedAsset, 'Vite should emit at least one hashed asset.');
  const assetResponse = await fetch(`${base}/assets/${hashedAsset}`);
  check('hashed assets use immutable cache headers', () => {
    assert.equal(assetResponse.status, 200);
    assert.equal(assetResponse.headers.get('cache-control'), 'public, max-age=31536000, immutable');
  });

  const cssAsset = assets.find(name => name.endsWith('.css'));
  assert.ok(cssAsset, 'Vite should emit a CSS asset.');
  const [indexSource, cssSource, trackingSource] = await Promise.all([
    readFile('apps/web/dist/index.html', 'utf8'),
    readFile(`apps/web/dist/assets/${cssAsset}`, 'utf8'),
    readFile('apps/web/src/features/tracking/TrackingPage.tsx', 'utf8')
  ]);
  check('tracking shell and styles do not request third-party resources', () => {
    assert.doesNotMatch(indexSource, /https?:\/\//i);
    assert.doesNotMatch(cssSource, /https?:\/\//i);
    assert.doesNotMatch(trackingSource, /https?:\/\//i);
  });
  const fontPaths = [
    ...new Set(
      [...cssSource.matchAll(/url\(["']?(\/fonts\/[^)"']+\.woff2)["']?\)/g)].map(match => match[1])
    )
  ];
  const fonts = await Promise.all(
    fontPaths.map(async path => {
      const response = await fetch(`${base}${path}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      return { path, response, bytes };
    })
  );
  check('self-hosted fonts referenced by built CSS are served as WOFF2', () => {
    assert.ok(fonts.length > 0, 'Built CSS must reference self-hosted fonts.');
    for (const { path, response, bytes } of fonts) {
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type') ?? '', /^font\/woff2/, path);
      assert.equal(bytes.subarray(0, 4).toString(), 'wOF2', path);
    }
  });

  const previousAdminSetting = process.env.ADMIN_ENABLED;
  let gatedServer;
  try {
    process.env.ADMIN_ENABLED = 'false';
    gatedServer = createApp().listen(0, '127.0.0.1');
    await new Promise(resolve => gatedServer.once('listening', resolve));
    const gatedPage = await fetch(`http://127.0.0.1:${gatedServer.address().port}/admin`);
    const gatedBody = await gatedPage.text();
    check('admin gate off is not swallowed by SPA fallback', () => {
      assert.equal(gatedPage.status, 404);
      assert.doesNotMatch(gatedBody, /id="root"/);
    });
  } finally {
    if (gatedServer) await new Promise(resolve => gatedServer.close(resolve));
    if (previousAdminSetting === undefined) delete process.env.ADMIN_ENABLED;
    else process.env.ADMIN_ENABLED = previousAdminSetting;
  }

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
  })
    .jpeg()
    .toBuffer();
  const preview = await sharp({
    create: { width: 60, height: 90, channels: 3, background: '#def' }
  })
    .png()
    .toBuffer();
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
    assert.match(order.data.orderNumber, /^HM-[0-9A-F]{16}$/);
    assert.ok(!('trackingToken' in order.data));
  });

  const tracking = await request('/api/tracking/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber: order.data.orderNumber, phone: payload.recipient.phone })
  });
  check('canonical private tracking lookup', () => {
    assert.equal(tracking.response.status, 200);
    assert.equal(tracking.data.orderNumber, order.data.orderNumber);
    assert.equal(tracking.data.status, 'pending');
    assert.deepEqual(Object.keys(tracking.data).sort(), [
      'createdAt',
      'history',
      'orderNumber',
      'status',
      'trackingCode',
      'updatedAt'
    ]);
  });

  const retiredPaths = [
    '/api/demo-checkouts',
    '/api/demo-tracking',
    '/api/auth/session',
    '/api/me'
  ];
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
  await testDatabase.destroy();
  await rm(root, { recursive: true, force: true });
  if (originalAppUrl === undefined) delete process.env.APP_URL;
  else process.env.APP_URL = originalAppUrl;
}
