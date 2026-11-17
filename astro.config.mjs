// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// While the site is only on the preview address (elkojo.github.io/cheming-site/),
// the build workflow sets SITE_BASE=/cheming-site. On the real domain it is '/'.
const base = process.env.SITE_BASE || '/';
const site = process.env.SITE_URL || 'https://cheming.site';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always', // keep URLs identical to WordPress: /pump/, /kod/ …
  integrations: [sitemap()],
});
