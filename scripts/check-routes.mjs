import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { matchRoute } from '../apps/web/src/shared/router.ts';

const sourceRoot = 'apps/web/src';
const sourceFiles = [];

async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (/\.(?:tsx|ts)$/.test(entry.name)) sourceFiles.push(path);
  }
}

await collect(sourceRoot);
const links = [];
for (const path of sourceFiles) {
  const source = await readFile(path, 'utf8');
  for (const match of source.matchAll(/<Link\b([^>]*)>/gs)) {
    const attribute = match[1] ?? '';
    const destination = /\bto\s*=\s*(["'])(.*?)\1/s.exec(attribute)?.[2];
    assert.ok(destination, `${relative('.', path)} has a Link without a static to="/route"`);
    let pathname;
    try {
      const url = new URL(destination, 'http://routes.check');
      assert.equal(url.origin, 'http://routes.check', `${path} links outside this site`);
      pathname = url.pathname;
    } catch {
      assert.fail(`${relative('.', path)} has an invalid Link destination: ${destination}`);
    }
    assert.ok(matchRoute(pathname), `${relative('.', path)} links to missing route ${pathname}`);
    links.push(`${relative('.', path)} → ${pathname}`);
  }
}

assert.ok(links.length > 0, 'No <Link to="..."> destinations were found.');
console.log(`Route links: ${links.length} checked, all destinations resolve.`);
