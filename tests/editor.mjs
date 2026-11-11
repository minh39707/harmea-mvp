import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { cardSvg } from '../apps/web/src/features/editor/card-svg.ts';
import {
  template,
  centerCrop,
  zoomCrop,
  moveCrop,
  validCrop
} from '../apps/web/src/features/editor/geometry.ts';
import { orderDesign } from '../apps/web/src/features/editor/validate-design.ts';
import { imageHeader } from '../apps/web/src/features/editor/image-header.ts';
import { parseCart } from '../apps/web/src/features/cart/cart-storage.ts';
import { persistCartItem } from '../apps/web/src/features/cart/persist-cart-item.ts';
import { cleanOrphanAssetKeys } from '../apps/web/src/features/editor/orphan-assets.ts';
import {
  fitWithin,
  hasLowPrintResolution,
  cropPrintResolution
} from '../apps/web/src/features/editor/photo-processing.ts';
import { blankDesign } from '../apps/web/src/shared/types.ts';

const design = {
  ...blankDesign,
  fullName: 'Nguyễn Minh Anh',
  dateOfBirth: '2003-01-15',
  commemorativeDate: '2026-10-29',
  place: 'Hà Nội, một nơi đáng nhớ',
  signatureText: 'Gửi người thương',
  musicUrl: 'https://open.spotify.com/track/qa',
  color: 'cream'
};

test('artwork, physical cut and safe area dimensions stay separate', () => {
  assert.equal(template.width, 1024);
  assert.equal(template.height, 650);
  assert.deepEqual(template.physical, { x: 20, y: 15, width: 984, height: 620 });
  assert.deepEqual(template.safe, { x: 50, y: 40, width: 924, height: 570 });
  const safe = template.safe,
    p = template.portrait;
  assert.ok(
    p.x >= safe.x &&
      p.y >= safe.y &&
      p.x + p.width <= safe.x + safe.width &&
      p.y + p.height <= safe.y + safe.height
  );
});
test('landscape/portrait crops preserve frame aspect and remain bounded when moved/zoomed', () => {
  for (const [width, height] of [
    [8000, 1000],
    [1000, 8000],
    [4032, 3024],
    [3024, 4032],
    [1, 8192],
    [8192, 1]
  ]) {
    const initial = centerCrop(width, height);
    for (const zoom of [1, 1.05, 1.5, 2, 3])
      for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
        const crop = moveCrop(
          moveCrop(zoomCrop(initial, width, height, zoom), 'x', fraction),
          'y',
          fraction
        );
        assert.ok(validCrop(crop));
        assert.ok(
          Math.abs(
            (crop.width * width) / (crop.height * height) -
              template.portrait.width / template.portrait.height
          ) < 1e-8
        );
      }
  }
  assert.equal(validCrop({ x: 0, y: 0, width: NaN, height: 1 }), false);
  assert.equal(validCrop({ x: 0.5, y: 0, width: 1, height: 1 }), false);
});
test('canonical design serializer omits empty optional dates and browser-only data', () => {
  const value = orderDesign({ ...blankDesign, fullName: '  QA  ', musicUrl: design.musicUrl });
  assert.deepEqual(Object.keys(value).sort(), ['color', 'crop', 'fullName', 'musicUrl']);
  assert.equal(value.fullName, 'QA');
  assert.ok(!('photo' in value));
  assert.ok(!('photoWidth' in value));
  for (const patch of [
    { dateOfBirth: '2099-01-01' },
    { dateOfBirth: '2026-02-30' },
    { musicUrl: 'javascript:alert(1)' },
    { musicUrl: 'https://open.spotify.com.evil.example/qa' },
    { crop: { x: 1, y: 0, width: 1, height: 1 } },
    { fullName: 'x'.repeat(81) }
  ])
    assert.throws(() => orderDesign({ ...design, ...patch }));
});
test('SVG proof displays DOB, escapes text and cannot embed an external photo URL', async () => {
  const svg = cardSvg(design);
  assert.ok(svg.includes('15/01/2003'));
  assert.notEqual(svg, cardSvg({ ...design, dateOfBirth: '2004-02-16' }));
  const escaped = cardSvg({
    ...design,
    fullName: '<script>&"QA',
    photo: 'https://evil.example/image.png'
  });
  assert.ok(!escaped.includes('<script>'));
  assert.ok(!escaped.includes('https://evil.example'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  const plain = await sharp(Buffer.from(svg)).png().toBuffer();
  const guided = await sharp(Buffer.from(cardSvg(design, true)))
    .png()
    .toBuffer();
  assert.notDeepEqual(plain, guided);
  const meta = await sharp(plain).metadata();
  assert.equal(meta.width, 1024);
  assert.equal(meta.height, 650);
  assert.ok(plain.length < 2 * 1024 * 1024);
});
test('real image headers reject oversized pixel counts and mismatched/unknown formats before browser decode', async () => {
  for (const format of ['png', 'jpeg']) {
    const bytes = await sharp({
      create: { width: 120, height: 180, channels: 3, background: '#abc' }
    })
      [format]()
      .toBuffer();
    assert.deepEqual(imageHeader(new Uint8Array(bytes)), {
      width: 120,
      height: 180,
      type: `image/${format}`
    });
  }
  for (const [width, height] of [
    [9000, 1],
    [5000, 4001]
  ]) {
    const bytes = await sharp({ create: { width, height, channels: 3, background: 'red' } })
      .png()
      .toBuffer();
    assert.throws(() => imageHeader(new Uint8Array(bytes)));
  }
  assert.throws(() => imageHeader(new TextEncoder().encode('fake PNG')));
});
test('actual SVG raster proof uses expected source crop, not a stretched image', async () => {
  const width = 300,
    height = 100,
    raw = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 3;
      raw[offset + (x < 100 ? 0 : x < 200 ? 1 : 2)] = 255;
    }
  const bytes = await sharp(raw, { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
  const source = {
    ...design,
    photo: 'data:image/png;base64,' + bytes.toString('base64'),
    photoWidth: width,
    photoHeight: height
  };
  const left = { x: 0, y: 0, width: 0.3, height: 1 },
    right = { ...left, x: 0.7 };
  for (const [crop, expected] of [
    [left, [255, 0, 0]],
    [right, [0, 0, 255]]
  ]) {
    const result = await sharp(Buffer.from(cardSvg({ ...source, crop })))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const offset = (425 * result.info.width + 285) * result.info.channels;
    assert.deepEqual([...result.data.subarray(offset, offset + 3)], expected);
  }
});
test('Vietnamese, long fields and portrait/landscape references produce complete PNGs', async () => {
  const record = process.env.HARMEA_EDITOR_QA_RECORD;
  const root = record ? await mkdtemp(join(tmpdir(), 'harmea-editor-b-')) : null;
  const fixtures = [];
  for (const [name, width, height, fields] of [
    ['portrait-vietnamese', 120, 240, {}],
    ['landscape-vietnamese', 240, 120, { color: 'blue' }],
    [
      'long-fields',
      120,
      120,
      {
        fullName: 'W'.repeat(80),
        place: '界'.repeat(120),
        signatureText: '界'.repeat(80),
        color: 'rose'
      }
    ]
  ]) {
    const photo = await sharp({ create: { width, height, channels: 3, background: '#84acb8' } })
      .png()
      .toBuffer();
    const current = {
      ...design,
      ...fields,
      photo: 'data:image/png;base64,' + photo.toString('base64'),
      photoWidth: width,
      photoHeight: height,
      crop: centerCrop(width, height)
    };
    const svg = cardSvg(current);
    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    assert.ok(png.length > 10000 && png.length <= 2 * 1024 * 1024);
    if (root) {
      const path = join(root, `${name}.png`);
      await writeFile(path, png);
      fixtures.push(path);
    }
  }
  // Fixtures contain generated artwork and fictional text only, no user files.
  if (record)
    await writeFile(
      record,
      JSON.stringify(
        {
          method:
            'Sharp rasterization of the same self-contained SVG used by browser preview/export; not browser Canvas testing',
          fixtures
        },
        null,
        2
      ) + '\n'
    );
});

test('cart JSON round-trip keeps original asset references and migrates legacy metadata safely', () => {
  const legacy = {
    id: 'legacy',
    productId: 'product',
    quantity: 2,
    design: {
      fullName: 'Old QA',
      signatureText: '',
      musicUrl: design.musicUrl,
      place: '',
      dateOfBirth: '',
      commemorativeDate: '',
      color: 'cream',
      photo: ''
    }
  };
  const current = {
    id: 'new',
    productId: 'product',
    quantity: 1,
    templateVersion: template.version,
    assetKey: '12345678-1234-4234-8234-123456789012',
    design: { ...design, photoWidth: 120, photoHeight: 240, crop: centerCrop(120, 240) }
  };
  const parsed = parseCart(JSON.parse(JSON.stringify([legacy, current, { invalid: true }])));
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0].design.crop, { x: 0, y: 0, width: 1, height: 1 });
  assert.equal(parsed[0].assetKey, undefined);
  assert.equal(parsed[1].assetKey, current.assetKey);
  assert.equal(parsed[1].templateVersion, template.version);
  assert.deepEqual(parsed[1].design.crop, current.design.crop);
  assert.deepEqual(orderDesign(parsed[1].design), orderDesign(current.design));
});

test('photo sizing never enlarges and print warning follows the selected crop', () => {
  assert.deepEqual(fitWithin(4000, 3000), { width: 2400, height: 1800 });
  assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  assert.deepEqual(cropPrintResolution(1346, 2126, { x: 0, y: 0, width: 0.5, height: 0.5 }), {
    width: 673,
    height: 1063
  });
  assert.equal(hasLowPrintResolution(1346, 2126, { x: 0, y: 0, width: 0.5, height: 0.5 }), false);
  assert.equal(hasLowPrintResolution(1346, 2126, { x: 0, y: 0, width: 0.49, height: 0.5 }), true);
  assert.throws(() => fitWithin(0, 600));
});

function memoryCartStore(initial = []) {
  const cart = [...initial];
  const blobs = new Map();
  const events = [];
  let nextKey = 0;
  let saveAssetFailure = false;
  let saveCartFailures = 0;
  const failedRemoveKeys = new Set();
  return {
    cart,
    blobs,
    events,
    failNextAssetWrite() {
      saveAssetFailure = true;
    },
    failCartWrites(count = 1) {
      saveCartFailures = count;
    },
    failNextRemove(key) {
      failedRemoveKeys.add(key);
    },
    loadCart() {
      return [...cart];
    },
    saveCart(next) {
      events.push('write-cart');
      if (saveCartFailures > 0) {
        saveCartFailures--;
        throw Error('localStorage unavailable');
      }
      cart.splice(0, cart.length, ...next);
    },
    async saveAssets(value) {
      events.push('write-blob');
      if (saveAssetFailure) {
        saveAssetFailure = false;
        throw Error('IndexedDB unavailable');
      }
      const key = `asset-${++nextKey}`;
      blobs.set(key, value);
      return key;
    },
    async removeAssets(key) {
      events.push(`remove:${key}`);
      if (failedRemoveKeys.delete(key)) throw Error('transient IndexedDB failure');
      blobs.delete(key);
    }
  };
}

const itemDraft = overrides => ({
  productId: 'product-1',
  templateVersion: template.version,
  quantity: 1,
  design: { ...design, photoWidth: 1200, photoHeight: 1800, ...overrides }
});
const editorAssets = () => ({
  photo: new Blob(['photo'], { type: 'image/jpeg' }),
  preview: new Blob(['preview'], { type: 'image/png' })
});

test('cart item save creates separate blobs; update changes only its selected item', async () => {
  const store = memoryCartStore();
  const sharedBlob = editorAssets();
  const first = await persistCartItem(store, {
    draft: itemDraft({ fullName: 'first' }),
    assets: sharedBlob,
    makeId: () => 'item-1'
  });
  const second = await persistCartItem(store, {
    draft: itemDraft({ fullName: 'second' }),
    assets: sharedBlob,
    makeId: () => 'item-2'
  });
  assert.notEqual(first.item.assetKey, second.item.assetKey);
  assert.notEqual(first.item.id, second.item.id);
  assert.deepEqual(store.events.slice(0, 4), [
    'write-blob',
    'write-cart',
    'write-blob',
    'write-cart'
  ]);
  const edited = await persistCartItem(store, {
    editing: first.item,
    draft: itemDraft({ fullName: 'updated first' }),
    assets: editorAssets()
  });
  assert.equal(edited.item.id, first.item.id);
  assert.notEqual(edited.item.assetKey, first.item.assetKey);
  assert.equal(store.cart.length, 2);
  assert.equal(store.cart[0].design.fullName, 'updated first');
  assert.equal(store.cart[1].design.fullName, 'second');
  assert.equal(store.blobs.has(first.item.assetKey), false);
  assert.equal(store.blobs.has(second.item.assetKey), true);
  assert.deepEqual(store.events.slice(4), [
    'write-blob',
    'write-cart',
    `remove:${first.item.assetKey}`
  ]);
});

test('cart item persistence compensates storage failures without dangling metadata or blobs', async () => {
  const store = memoryCartStore();
  store.failNextAssetWrite();
  await assert.rejects(
    persistCartItem(store, { draft: itemDraft({}), assets: editorAssets() }),
    /IndexedDB unavailable/
  );
  assert.equal(store.cart.length, 0);
  assert.equal(store.blobs.size, 0);

  store.failCartWrites();
  await assert.rejects(
    persistCartItem(store, { draft: itemDraft({}), assets: editorAssets() }),
    /localStorage unavailable/
  );
  assert.equal(store.cart.length, 0);
  assert.equal(store.blobs.size, 0);

  const original = await persistCartItem(store, {
    draft: itemDraft({ fullName: 'original' }),
    assets: editorAssets(),
    makeId: () => 'item-original'
  });
  store.failCartWrites();
  store.failNextRemove('asset-3');
  await assert.rejects(
    persistCartItem(store, {
      editing: original.item,
      draft: itemDraft({ fullName: 'failed update' }),
      assets: editorAssets()
    }),
    /localStorage unavailable/
  );
  assert.deepEqual(store.cart, [original.item]);
  assert.deepEqual([...store.blobs.keys()], [original.item.assetKey]);

  store.failNextRemove(original.item.assetKey);
  await assert.rejects(
    persistCartItem(store, {
      editing: original.item,
      draft: itemDraft({ fullName: 'failed cleanup' }),
      assets: editorAssets()
    }),
    /transient IndexedDB failure/
  );
  assert.deepEqual(store.cart, [original.item]);
  assert.deepEqual([...store.blobs.keys()], [original.item.assetKey]);
});

test('orphan cleanup removes only IndexedDB assets unreferenced by cart metadata', async () => {
  const assets = new Set(['used-a', 'orphan-a', 'orphan-b']);
  const removed = await cleanOrphanAssetKeys([...assets], ['used-a'], async key =>
    assets.delete(key)
  );
  assert.deepEqual(removed, ['orphan-a', 'orphan-b']);
  assert.deepEqual([...assets], ['used-a']);
});

test('full cart and deletion from another tab leave editor data and assets untouched', async () => {
  const fullCart = Array.from({ length: 10 }, (_, index) => ({
    id: `item-${index}`,
    productId: 'product-1',
    assetKey: `asset-${index}`,
    quantity: 1,
    design: { ...design, photoWidth: 1200, photoHeight: 1800 }
  }));
  const fullStore = memoryCartStore(fullCart);
  await assert.rejects(
    persistCartItem(fullStore, { draft: itemDraft({}), assets: editorAssets() }),
    /đủ 10 thẻ/
  );
  assert.equal(fullStore.cart.length, 10);
  assert.equal(fullStore.blobs.size, 0);

  const deletedStore = memoryCartStore();
  await assert.rejects(
    persistCartItem(deletedStore, {
      editing: { id: 'deleted', ...itemDraft({}), assetKey: 'missing-asset' },
      draft: itemDraft({}),
      assets: editorAssets()
    }),
    /đã bị xóa ở tab khác/
  );
  assert.equal(deletedStore.blobs.size, 0);
  assert.equal(deletedStore.cart.length, 0);
});
