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
  assert.equal(template.width / template.height, 57 / 90);
  assert.deepEqual(template.physical, { x: 15, y: 20, width: 540, height: 860 });
  assert.deepEqual(template.safe, { x: 40, y: 40, width: 490, height: 820 });
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
  assert.equal(meta.width, 570);
  assert.equal(meta.height, 900);
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
