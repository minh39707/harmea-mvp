// Local browser QA against an isolated MySQL database and the built application.
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { createTestDatabase } from '../tests/helpers/db.mjs';
import { openDatabase } from '../apps/api/src/db.ts';
import { createApp } from '../apps/api/src/app.ts';

assert.ok(
  process.env.HARMEA_PLAYWRIGHT_MODULE,
  'Set HARMEA_PLAYWRIGHT_MODULE to an existing Playwright install'
);
const { chromium } = await import(
  pathToFileURL(resolve(process.env.HARMEA_PLAYWRIGHT_MODULE)).href
);
const fixture = await createTestDatabase();
const root = await mkdtemp(join(tmpdir(), 'harmea-qr-browser-'));
process.env.STORAGE_DRIVER = 'local';
process.env.UPLOAD_DIR = join(root, 'uploads');
process.env.ADMIN_ENABLED = 'true';
const db = await openDatabase();
const server = createApp(db).listen(0, '127.0.0.1');
await new Promise(r => server.once('listening', r));
const base = `http://127.0.0.1:${server.address().port}`;
process.env.APP_URL = base;
const report = { checks: [], layouts: [], errors: [] };
const assets = 'docs/qa/assets';
await mkdir(assets, { recursive: true });
const photo = await sharp({
  create: { width: 600, height: 900, channels: 3, background: '#a9b9c9' }
})
  .jpeg()
  .toBuffer();
let browser;
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce'
  });
  page.on('pageerror', e => report.errors.push(e.message));
  await page.goto(base + '/design');
  await page.locator('#card-full-name').fill('QR Browser QA');
  await page.locator('#card-music-url').fill('https://open.spotify.com/track/qa');
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'synthetic.jpg', mimeType: 'image/jpeg', buffer: photo });
  await page.locator('.crop-controls').waitFor();
  await page.locator('.btn-primary-add').click();
  await page.waitForFunction(
    () => JSON.parse(localStorage.getItem('harmea.cart.v2') ?? '[]').length === 1
  );
  await page.goto(base + '/cart');
  await page.locator('.btn-checkout-primary').click();
  await page.getByLabel('Họ tên người nhận *', { exact: true }).fill('QR Browser QA');
  await page.getByLabel('Số điện thoại liên hệ *', { exact: true }).fill('0900000000');
  await page
    .getByLabel('Địa chỉ nhận hàng chi tiết *', { exact: true })
    .fill('Synthetic QA address, do not ship');
  await page.getByRole('checkbox').check();
  await page.locator('.btn-proceed-payment').click();
  await page.getByRole('heading', { name: 'Thanh toán bằng QR', exact: true }).waitFor();
  const orderNumber = (await page.locator('.success-order-number').innerText()).trim();
  assert.equal(
    await page.locator('.transfer-qr').evaluate(img => img.complete && img.naturalWidth > 0),
    true
  );
  assert.equal(await page.locator('.transfer-reference').innerText(), orderNumber);
  assert.match(await page.locator('.transfer-amount').innerText(), /89[.,]000/);
  report.checks.push(
    'Real checkout saves order and displays supplied QR, snapshot amount 89000 VND and order reference'
  );
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(
        document
          .getAnimations()
          .filter(animation => animation.effect?.getTiming().iterations !== Infinity)
          .map(animation => animation.finished)
      );
    });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= width, `Overflow at ${width}`);
    report.layouts.push({ width, scrollWidth });
    await page.screenshot({ path: `${assets}/2026-11-12-payment-qr-${width}.png`, fullPage: true });
  }
  let dropFirst = true;
  await page.route('**/api/tracking/payment-confirm', async route => {
    if (dropFirst) {
      dropFirst = false;
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.abort('failed');
    } else await route.continue();
  });
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  await page.locator('.transfer-panel [role=alert]').waitFor();
  assert.equal(await page.locator('.transfer-reported').count(), 0);
  await page.getByRole('button', { name: 'Tôi đã chuyển khoản', exact: true }).click();
  await page.locator('.transfer-reported').waitFor();
  const row = (
    await db.query('SELECT id,status,version,subtotal_vnd FROM orders WHERE order_number=?', [
      orderNumber
    ])
  ).rows[0];
  assert.equal(row.status, 'pending');
  assert.equal(row.version, 1);
  assert.equal(
    (await db.query('SELECT * FROM order_payment_reports WHERE order_id=?', [row.id])).rows.length,
    1
  );
  report.checks.push(
    'Dropped response after commit shows error; retry succeeds with one durable report and unchanged order state/version'
  );
  const storage = await page.evaluate(() => ({
    local: { ...localStorage },
    session: { ...sessionStorage }
  }));
  assert.ok(!JSON.stringify(storage).includes('0900000000'));
  assert.ok(!JSON.stringify(storage).includes('Synthetic QA address'));
  await page.goto(base + '/admin/orders/' + row.id);
  await page.getByText('Khách báo đã chuyển khoản lúc', { exact: false }).waitFor();
  report.checks.push(
    'Admin displays persisted customer declaration after page navigation; phone/address absent from browser storage'
  );
  assert.deepEqual(report.errors, []);
} finally {
  await browser?.close();
  await new Promise(r => server.close(r));
  await db.close();
  await fixture.destroy();
  await rm(root, { recursive: true, force: true });
  await writeFile('docs/qa/2026-11-12-qr-browser.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
