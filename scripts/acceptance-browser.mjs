// Optional local QA: point HARMEA_PLAYWRIGHT_MODULE to an existing Playwright install.
// No browser dependency is added to the application.
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

assert.equal(process.env.HARMEA_H_ACCEPTANCE, 'true');
assert.ok(process.env.HARMEA_PLAYWRIGHT_MODULE);
const { chromium } = await import(
  pathToFileURL(resolve(process.env.HARMEA_PLAYWRIGHT_MODULE)).href
);
const base = 'http://127.0.0.1:3187';
const [runtime] = JSON.parse(
  execFileSync('docker', ['inspect', 'harmea-h-20261111-app'], { encoding: 'utf8' })
);
assert.equal(runtime.Config.Labels['com.docker.compose.project'], 'harmea-h-20261111');
const suffix = process.env.HARMEA_H_REPORT_SUFFIX ?? '';
assert.ok(['', '-csp', '-h-fix', '-v1.1.0'].includes(suffix));
if (process.env.HARMEA_H_EXPECTED_DIGEST) {
  const [image] = JSON.parse(
    execFileSync('docker', ['image', 'inspect', runtime.Image], { encoding: 'utf8' })
  );
  assert.ok(
    image.RepoDigests.some(ref => ref.endsWith('@' + process.env.HARMEA_H_EXPECTED_DIGEST)),
    'The running container must use the intended release digest.'
  );
}
const out = resolve('docs/qa');
const assets = join(out, 'assets');
await mkdir(assets, { recursive: true });
const report = {
  base,
  image: runtime.Config.Image,
  imageId: runtime.Image,
  checks: [],
  failures: [],
  browsers: [],
  layouts: [],
  externalRequests: []
};
const check = name => {
  report.checks.push(name);
  console.log(name);
};
const canonical = item => {
  const copy = structuredClone(item);
  if (!copy.design.signatureData) delete copy.design.signatureData;
  return copy;
};
const cart = page =>
  page.evaluate(() => JSON.parse(localStorage.getItem('harmea.cart.v2') ?? '[]'));
const waitCart = (page, length) =>
  page.waitForFunction(
    n => JSON.parse(localStorage.getItem('harmea.cart.v2') ?? '[]').length === n,
    length
  );
const photo = await sharp({
  create: { width: 600, height: 900, channels: 3, background: '#a9b9c9' }
})
  .jpeg()
  .withMetadata({ orientation: 6 })
  .toBuffer();
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  report.browsers.push({ channel, version: browser.version(), headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ['clipboard-read', 'clipboard-write']
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (
      message.type() === 'error' &&
      /Content Security Policy|violates.*directive/i.test(message.text())
    )
      errors.push(message.text());
  });
  page.on('request', request => {
    if (!request.url().startsWith(base) && !/^(data:|blob:)/.test(request.url()))
      report.externalRequests.push(request.url());
  });
  const screenshot = async (label, width) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    if (suffix !== '-csp' && width === 375)
      await page.screenshot({
        path: join(assets, `2026-11-11-h${suffix}-${channel}-${label}-${width}.jpg`),
        type: 'jpeg',
        quality: 72,
        fullPage: true
      });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth
    }));
    report.layouts.push({ channel, label, ...layout });
    if (Math.max(layout.scrollWidth, layout.bodyScrollWidth) > width)
      report.failures.push(
        `${channel}: ${label} content exceeds ${width}px viewport (${layout.bodyScrollWidth}px body)`
      );
  };
  try {
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    for (const width of [375, 768, 1440]) await screenshot('home', width);
    await page.goto(base + '/design');
    await page.waitForLoadState('networkidle');
    for (const width of [375, 768, 1440]) await screenshot('design', width);
    const createCard = async (index, zoom = 1) => {
      await page.locator('#card-select').selectOption('new');
      await page.locator('#card-full-name').fill(`Nguyễn Thử ${index}`);
      await page
        .locator('#card-music-url')
        .fill('https://open.spotify.com/track/harmea-browser-fixture');
      await page
        .locator('input[type=file]')
        .setInputFiles({ name: 'synthetic-exif6.jpg', mimeType: 'image/jpeg', buffer: photo });
      await page.locator('.crop-controls input[type=range]').first().waitFor();
      await page.locator('.crop-controls input[type=range]').first().fill(String(zoom));
      for (const name of ['Kem kỷ niệm', 'Xanh bình yên', 'Hồng dịu dàng'])
        await page.getByRole('radio', { name, exact: true }).click();
      await page.locator('.btn-primary-add').click();
      await waitCart(page, index);
    };
    for (let i = 1; i <= 4; i++) await createCard(i, i === 2 ? 2 : 1);
    const saved = await cart(page);
    assert.equal(saved[0].design.photoWidth, 900);
    assert.equal(saved[0].design.photoHeight, 600);
    assert.notDeepEqual(saved[0].design.crop, saved[1].design.crop);
    check(
      `${channel}: four distinct cards, same synthetic EXIF6 image with two crops, three colors`
    );
    await page.reload();
    await page.waitForLoadState('networkidle');
    assert.deepEqual(await cart(page), saved);
    await page.locator('#card-select').selectOption(saved[1].id);
    await page.waitForFunction(
      expected => document.querySelector('#card-music-url')?.value === expected,
      saved[1].design.musicUrl
    );
    assert.equal(await page.locator('#card-full-name').inputValue(), saved[1].design.fullName);
    assert.equal(
      Number(await page.locator('.crop-controls input[type=range]').first().inputValue()),
      2
    );
    await page.locator('#card-select').selectOption('new');
    assert.equal(await page.locator('#card-full-name').inputValue(), '');
    assert.equal(await page.locator('#card-music-url').inputValue(), '');
    assert.equal(await page.locator('.crop-controls').count(), 0);
    assert.deepEqual(await cart(page), saved);
    await page.locator('#card-select').selectOption(saved[1].id);
    await page.waitForFunction(
      expected => document.querySelector('#card-music-url')?.value === expected,
      saved[1].design.musicUrl
    );
    check(
      `${channel}: dropdown restores card fields/photo/crop; new design resets draft without changing cart`
    );
    await page.locator('#card-full-name').fill('Nguyễn Thử 2 đã sửa');
    await page.getByRole('button', { name: 'Cập nhật thẻ này', exact: true }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem('harmea.cart.v2'))[1].design.fullName ===
        'Nguyễn Thử 2 đã sửa'
    );
    const edited = await cart(page);
    assert.deepEqual(canonical(edited[0]), canonical(saved[0]));
    assert.deepEqual(canonical(edited[2]), canonical(saved[2]));
    assert.deepEqual(canonical(edited[3]), canonical(saved[3]));
    const tab = await context.newPage();
    await tab.goto(base + '/cart');
    await tab.waitForLoadState('networkidle');
    await page.goto(base + '/cart');
    await page.getByRole('button', { name: 'Sửa thiết kế', exact: true }).nth(1).click();
    await page.waitForFunction(() =>
      document.querySelector('#card-music-url')?.value.includes('spotify')
    );
    await page.locator('#card-full-name').fill('Nguyễn Thử 2 đồng bộ');
    await page.getByRole('button', { name: 'Cập nhật thẻ này', exact: true }).click();
    await tab.getByRole('heading', { name: 'Nguyễn Thử 2 đồng bộ', exact: true }).waitFor();
    check(
      `${channel}: reload preserves four crops, editing card two leaves others intact, second tab updates`
    );
    await tab.close();
    await page.goto(base + '/cart');
    await page.waitForLoadState('networkidle');
    for (const width of [375, 768, 1440]) await screenshot('cart', width);
    const retained = (await cart(page))[3];
    await page.locator('.select-all-label').click();
    assert.equal(await page.locator('.select-all-label input').isChecked(), false);
    assert.equal(await page.locator('.btn-checkout-primary').isDisabled(), true);
    await page.evaluate(() => {
      history.pushState(null, '', '/checkout');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    assert.equal(
      await page.getByRole('button', { name: 'Xác nhận đặt thử →', exact: true }).isDisabled(),
      true
    );
    await page.getByRole('button', { name: '← Quay lại giỏ hàng', exact: true }).click();
    await page.locator('.select-all-label').click();
    await page.locator('.cart-item-card .item-select-checkbox-label').nth(3).click();
    await page.locator('.btn-checkout-primary').click();
    assert.equal(await page.locator('.summary-item-row').count(), 3);
    await page.getByLabel('Họ tên người nhận *', { exact: true }).fill('Khách thử browser H');
    await page.getByLabel('Số điện thoại liên hệ *', { exact: true }).fill('0900000000');
    await page
      .getByLabel('Địa chỉ nhận hàng chi tiết *', { exact: true })
      .fill('Địa chỉ giả browser H, không giao hàng');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Xác nhận đặt thử →', exact: true }).click();
    await page.getByRole('heading', { name: 'Đã nhận đơn', exact: true }).waitFor();
    const orderNumber = (await page.locator('.success-order-number').innerText()).trim();
    assert.match(orderNumber, /^HM-[0-9A-F]{16}$/);
    const listed = await (
      await fetch(`${base}/api/admin/orders?orderNumber=${orderNumber}`)
    ).json();
    const detail = await (await fetch(`${base}/api/admin/orders/${listed.items[0].id}`)).json();
    assert.equal(detail.items.length, 3);
    assert.equal(detail.quantity, 3);
    await page.getByRole('button', { name: 'Sao chép mã đơn', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), orderNumber);
    assert.deepEqual((await cart(page)).map(canonical), [canonical(retained)]);
    await page.reload();
    assert.deepEqual((await cart(page)).map(canonical), [canonical(retained)]);
    await page.goto(base + '/cart');
    await page.getByRole('button', { name: 'Sửa thiết kế', exact: true }).click();
    await page.locator('.crop-controls').waitFor();
    assert.equal(await page.locator('#card-full-name').inputValue(), retained.design.fullName);
    assert.equal(await page.getByRole('alert').count(), 0);
    // Receipt is in memory, so revisit tracking explicitly after the reload.
    await page.goto(base + '/track');
    await page.locator('#track-order-num').fill(orderNumber);
    check(
      `${channel}: zero selection cannot submit; checkout 3/4 retains fourth card and assets after reload; clipboard copy works`
    );
    await page.waitForURL('**/track');
    await page.locator('input[type=tel]').fill('+84 900 000 000');
    await page
      .getByRole('button', { name: /Tra cứu/, exact: false })
      .last()
      .click();
    await page.getByText('Chờ xác nhận', { exact: true }).first().waitFor();
    check(`${channel}: checkout to tracking UI with +84 phone`);
    for (const path of [
      '/faq',
      '/policies/shipping',
      '/policies/returns',
      '/policies/privacy',
      '/about',
      '/contact'
    ]) {
      await page.goto(base + path);
      assert.ok((await page.locator('main').innerText()).length > 30);
    }
    await page.goto(base + '/not-a-real-route');
    assert.match(await page.locator('main').innerText(), /404|không tìm thấy/i);
    await page.goBack();
    assert.ok(page.url().endsWith('/contact'));
    await page.goForward();
    assert.ok(page.url().endsWith('/not-a-real-route'));
    check(`${channel}: content, policy routes, 404, browser back/forward`);
    report.failures.push(...errors.map(message => `${channel}: page error ${message}`));
  } catch (error) {
    report.failures.push(`${channel}: ${error.message}`);
    await page.screenshot({
      path: join(assets, `2026-11-11-h${suffix}-${channel}-failure.png`),
      fullPage: true
    });
  } finally {
    await context.close();
    await browser.close();
  }
}
report.checkedAt = new Date().toISOString();
await writeFile(
  join(out, `2026-11-11-acceptance-browser${suffix}.json`),
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
