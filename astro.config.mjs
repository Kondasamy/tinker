import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// Dev and test pages (src/dev) are routed under /dev/ only in `astro dev` or with DEV_PAGES=1 (the e2e build),
// so the production build ships the module alone. Every src/dev/<name>.astro is served at /dev/<name> (og.astro has its own
// route), so a new dev page needs no edit here.
const devPages = {
  name: 'dev-pages',
  hooks: {
    'astro:config:setup': ({ command, config, injectRoute }) => {
      if (command !== 'dev' && !process.env.DEV_PAGES) return;
      for (const f of readdirSync(new URL('src/dev/', config.root))) {
        const p = f.replace(/\.astro$/, '');
        if (p !== f && p !== 'og') injectRoute({ pattern: `/dev/${p}`, entrypoint: `./src/dev/${f}` });
      }
      injectRoute({ pattern: '/dev/warmup', entrypoint: './src/dev/recap.astro' }); // the same fixture, as the warm-up
      injectRoute({ pattern: '/dev/og/[slug]', entrypoint: './src/dev/og.astro' }); // share-image template (pnpm og)
    },
  },
};

// `astro build` and `astro check` pre-bundle production React into Vite's dep cache; sharing node_modules/.vite with a
// running `astro dev` then feeds dev pages React's production jsx-dev-runtime (`_jsxDEV is not a function`, figures
// vanish). The dev server gets a cache nothing else writes to.
const devCache = {
  name: 'dev-cache',
  hooks: {
    'astro:config:setup': ({ command, updateConfig }) => {
      if (command === 'dev') updateConfig({ vite: { cacheDir: 'node_modules/.vite-dev' } });
    },
  },
};

// Pages and islands import a few committed files that also ship in public/ (Larkspur mini's meta.json, which load.ts
// fetches too). In dev those imports become /public/... requests and Vite warns "Assets in public directory cannot be
// imported from JavaScript". Dev serves them as modules instead; builds already bundle them, so this is dev only.
let publicDir = '';
const publicJson = {
  name: 'public-json',
  apply: 'serve',
  enforce: 'pre',
  configResolved(config) {
    publicDir = config.publicDir;
  },
  resolveId(source, importer) {
    if (!importer || !source.endsWith('.json') || !source.startsWith('.')) return null;
    const file = resolve(dirname(importer), source);
    return file.startsWith(publicDir + '/') ? `\0public-json:${file}` : null;
  },
  load(id) {
    if (!id.startsWith('\0public-json:')) return null;
    const file = id.slice('\0public-json:'.length);
    this.addWatchFile(file);
    return readFileSync(file, 'utf8'); // the id ends .json, so Vite's JSON plugin makes it a module as usual
  },
};

export default defineConfig({
  site: 'https://tinker.kondasamy.com',
  output: 'static',
  integrations: [react(), mdx(), devPages, devCache],
  vite: { plugins: [publicJson] },
});
