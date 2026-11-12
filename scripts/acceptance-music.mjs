import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

assert.equal(process.env.HARMEA_H_ACCEPTANCE, 'true');
const [runtime] = JSON.parse(
  execFileSync('docker', ['inspect', 'harmea-h-20261111-app'], { encoding: 'utf8' })
);
assert.equal(runtime.Config.Labels['com.docker.compose.project'], 'harmea-h-20261111');
assert.equal(runtime.NetworkSettings.Ports['3000/tcp'][0].HostPort, '3187');
const { chromium } = await import(
  pathToFileURL(resolve(process.env.HARMEA_PLAYWRIGHT_MODULE)).href
);
const base = 'http://127.0.0.1:3187';
const report = { image: runtime.Config.Image, imageId: runtime.Image, checks: [], failures: [] };
for (const channel of ['chrome', 'msedge']) {
  const browser = await chromium.launch({ channel, headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const requests = [];
  const errors = [];
  page.on('request', r => {
    if (new URL(r.url()).pathname.startsWith('/audio/')) requests.push(r.url());
  });
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(base);
    await page.waitForLoadState('networkidle');
    assert.equal(requests.length, 0, 'Do not fetch audio on initial load');
    assert.equal(await page.locator('audio').getAttribute('preload'), 'none');
    assert.equal((await (await fetch(base + '/api/products/current')).json()).unitPriceVnd, 89000);
    assert.equal(
      await page.locator('.btn-hero-primary').evaluate(n => getComputedStyle(n).backgroundColor),
      'rgb(19, 43, 79)'
    );
    await page.getByRole('button', { name: 'Chạm là phát nhạc', exact: true }).click();
    await page.waitForFunction(() => {
      const a = document.querySelector('audio');
      return a && !a.paused && a.currentTime > 0.2;
    });
    const audio = await page
      .locator('audio')
      .evaluate(a => ({ volume: a.volume, loop: a.loop, muted: a.muted, ready: a.readyState }));
    assert.equal(audio.volume, 0.35);
    assert.equal(audio.loop, true);
    assert.equal(audio.muted, false);
    assert.ok(audio.ready >= 2);
    assert.ok(requests.length > 0);
    await page.waitForFunction(() => localStorage.getItem('harmea.music.enabled.v1') === 'on');
    report.checks.push(
      `${channel}: no initial audio request; badge starts real MP3 at 35%; navy and API price 89000`
    );

    const beforeTracking = await page.locator('audio').elementHandle();
    await page.getByRole('link', { name: 'Tra cứu đơn', exact: true }).first().click();
    await page.waitForURL('**/track');
    assert.equal(await page.locator('audio').count(), 0);
    assert.equal(await page.locator('.background-music').count(), 0);
    assert.equal(await beforeTracking.evaluate(a => a.paused), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('harmea.music.enabled.v1')), 'on');
    await page.getByRole('link', { name: 'Trang chủ', exact: true }).first().click();
    await page.getByRole('button', { name: 'Phát tiếp nhạc nền', exact: true }).waitFor();
    assert.equal(await page.locator('audio').getAttribute('src'), null);
    await page.getByRole('button', { name: 'Phát tiếp nhạc nền', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('audio').paused);
    await page.getByRole('button', { name: 'Tắt nhạc nền', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate(a => a.paused), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('harmea.music.enabled.v1')), 'off');
    await page.reload();
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('audio').getAttribute('src'), null);
    assert.equal(await page.locator('audio').evaluate(a => a.paused), true);
    report.checks.push(
      `${channel}: tracking removes player; preference remembered; return/reload requires explicit click; off stays off`
    );

    await page.getByRole('button', { name: 'Chạm là phát nhạc', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('audio').paused);
    const beforeAdmin = await page.locator('audio').elementHandle();
    await page.evaluate(() => {
      history.pushState(null, '', '/admin');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await page.waitForURL('**/admin');
    assert.equal(await page.locator('audio').count(), 0);
    assert.equal(await page.locator('.background-music').count(), 0);
    assert.equal(await beforeAdmin.evaluate(a => a.paused), true);
    await page.goto(base + '/track');
    await page.waitForLoadState('networkidle');
    assert.equal(await page.locator('audio').count(), 0);
    assert.deepEqual(errors, []);
    report.checks.push(
      `${channel}: admin navigation unmounts playback; direct tracking has no player; no runtime errors`
    );
    await page.goto(base);
    await page.route('**/audio/nen.mp3', route => route.fulfill({ status: 404, body: '' }));
    await page.getByRole('button', { name: 'Chạm là phát nhạc', exact: true }).click();
    await page
      .getByText('Chưa phát được nhạc. Bạn có thể bấm phát lại.', { exact: true })
      .waitFor();
    assert.equal(await page.locator('audio').evaluate(a => a.paused), true);
    await page.unroute('**/audio/nen.mp3');
    await page.getByRole('button', { name: 'Chạm là phát nhạc', exact: true }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('audio').currentTime > 0.2 && !document.querySelector('audio').paused
    );
    report.checks.push(
      `${channel}: missing audio shows error; explicit retry recovers real playback`
    );
  } catch (error) {
    report.failures.push(`${channel}: ${error.message}`);
  } finally {
    await context.close();
    await browser.close();
  }
}
report.checkedAt = new Date().toISOString();
await writeFile(
  'docs/qa/2026-11-11-music-navy-price-browser.json',
  JSON.stringify(report, null, 2) + '\n'
);
console.log(JSON.stringify(report, null, 2));
if (report.failures.length) process.exitCode = 1;
