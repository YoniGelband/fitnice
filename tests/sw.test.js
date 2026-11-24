import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const swText = readFileSync(new URL('sw.js', root), 'utf8');

// Pull the FILES list out of sw.js.
const listText = /const FILES = \[([\s\S]*?)\];/.exec(swText)[1];
const files = [...listText.matchAll(/'([^']+)'/g)].map((match) => match[1]);

test('every file the service worker keeps really exists', () => {
  for (const file of files.filter((f) => f !== './')) {
    assert.ok(existsSync(new URL(file, root)), `${file} is listed in sw.js but does not exist`);
  }
});

test('every script in js/ is kept for offline use', () => {
  for (const name of readdirSync(new URL('js/', root))) {
    assert.ok(files.includes(`js/${name}`), `js/${name} is missing from the FILES list in sw.js`);
  }
});

test('every file the manifest and page point to is kept', () => {
  const manifest = JSON.parse(readFileSync(new URL('manifest.webmanifest', root), 'utf8'));
  for (const icon of manifest.icons) assert.ok(files.includes(icon.src), `${icon.src} is missing from sw.js`);
  for (const file of ['index.html', 'styles.css', 'manifest.webmanifest']) assert.ok(files.includes(file));
});
