// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkBreaks from 'remark-breaks';

// https://astro.build/config
export default defineConfig({
  site: 'https://blog.cabin1701.com',
  // Astro 7 は、タグの間の空白（インライン要素の間の半角スペース）を消す。文字がくっつくので、空白をそのまま出す（2026-10-13）
  compressHTML: false,
  base: '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    remarkPlugins: [remarkBreaks],
  },
});
