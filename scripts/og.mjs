/**
 * Draws the share (OG) image of every public page into public/og/<og>.jpg, 1200×630.
 * Run: pnpm og [slug or module id…] — after changing a page's title or text in src/lib/pages.ts, a chapter list, or a share picture.
 * Builds the site with the dev pages (src/dev/og.astro is the template), serves dist/ on a local port, and captures each
 * card with Playwright. dist/ then holds the dev pages too; deploys run their own clean `pnpm build`.
 */
import { execSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { pick } from './og-filter.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist'),
  OUT = path.join(ROOT, 'public/og');
const TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
};

execSync('astro build', { cwd: ROOT, stdio: 'inherit', env: { ...process.env, DEV_PAGES: '1' } });
const all = await readdir(path.join(DIST, 'dev/og'));
const filters = process.argv.slice(2);
const unmatched = filters.filter(f => !pick(all, [f]).length);
if (unmatched.length) {
  console.error(`pnpm og: no share image matches ${unmatched.join(', ')} (use a module id, \`home\` or a page slug)`);
  process.exit(1);
}
const slugs = pick(all, filters);

const server = createServer(async (req, res) => {
  let file = path.join(DIST, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!path.extname(file)) file = path.join(file, 'index.html');
  if (!file.startsWith(DIST)) return res.writeHead(403).end();
  try {
    res
      .writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' })
      .end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(0);
const base = `http://localhost:${server.address().port}`;

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const slug of slugs) {
  await page.goto(`${base}/dev/og/${slug}/`);
  await page.evaluate(() => document.fonts.ready);
  // JPEG: the paper grain makes PNGs ~300 KB; at quality 88 they stay crisp at a fraction of that
  await page.locator('.og').screenshot({ path: path.join(OUT, `${slug}.jpg`), type: 'jpeg', quality: 88 });
  console.log(`og: public/og/${slug}.jpg`);
}
await browser.close();
server.close();
