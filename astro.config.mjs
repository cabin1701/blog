// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://cabin1701.github.io',
  base: '/blog',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
