import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// Dev and test pages (src/dev) are routed under /dev/ only in `astro dev` or with DEV_PAGES=1 (the e2e build),
// so the production build ships the module alone.
const devPages = {
  name: 'dev-pages',
  hooks: {
    'astro:config:setup': ({ command, injectRoute }) => {
      if (command !== 'dev' && !process.env.DEV_PAGES) return;
      for (const p of ['blocks', 'canvas', 'runner', 'flat', 'quiz', 'recap', 'agents', 'evals', 'guardrails', 'tokens', 'transformers']) injectRoute({ pattern: `/dev/${p}`, entrypoint: `./src/dev/${p}.astro` });
      injectRoute({ pattern: '/dev/warmup', entrypoint: './src/dev/recap.astro' });   // the same fixture, as the warm-up
      injectRoute({ pattern: '/dev/og/[slug]', entrypoint: './src/dev/og.astro' });   // share-image template (pnpm og)
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

export default defineConfig({
  site: 'https://explain.kondasamy.com',
  output: 'static',
  integrations: [react(), mdx(), devPages, devCache],
});
