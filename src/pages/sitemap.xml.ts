// Plain /sitemap.xml (the address most tools try first), alongside the
// sitemap-index.xml that @astrojs/sitemap generates. Lists the same pages.
import type { APIRoute } from 'astro';
import { tools } from '../data/tools';

export const GET: APIRoute = ({ site }) => {
  const base = new URL(import.meta.env.BASE_URL, site);
  const paths = ['', 'about/', ...tools.map((t) => `${t.slug}/`)];
  const urls = paths.map((p) => `<url><loc>${new URL(p, base).href}</loc></url>`).join('');
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
};
