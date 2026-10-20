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
      for (const p of ['blocks', 'canvas', 'runner']) injectRoute({ pattern: `/dev/${p}`, entrypoint: `./src/dev/${p}.astro` });
    },
  },
};

export default defineConfig({
  output: 'static',
  integrations: [react(), mdx(), devPages],
});
