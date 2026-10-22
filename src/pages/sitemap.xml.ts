// Every indexable page, from the same list that gives each page its title and share image (recaps are left out).
import type { APIRoute } from 'astro';
import { ALL_PAGES } from '../lib/pages';

export const GET: APIRoute = ({ site }) =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      ALL_PAGES.filter(p => !p.noindex)
        .map(p => `  <url><loc>${new URL(p.path, site).href}</loc></url>\n`)
        .join('') +
      '</urlset>\n',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
