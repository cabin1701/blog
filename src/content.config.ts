import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slug as githubSlug } from 'github-slugger';

// Ignore intermediate folders (e.g. year subfolders used for filesystem organization)
// so the entry id/slug depends only on the top-level lang folder + filename, never on
// how deep the file is nested. This keeps published URLs stable even if files get
// reorganized into subfolders later.
// この年月から、URL に年と月が入る。
export const DATED_FROM = 202611;

function generateId({ entry }: { entry: string }) {
  const parts = entry.split('/');
  const top = parts[0];
  // 頭の「日付の日＋_」（例：29_map-before-map.md）はファイルの並べ替え用で、URL には入れない（2026-09-29）。
  const filename = parts[parts.length - 1].replace(/\.md$/, '').replace(/^\d{2}_/, '');
  // 2026年11月以降のフォルダの記事は、URL に年と月を入れる（/2026/11/slug/）。slug が短くても、他の記事と被らない。
  // それより前の記事は、今までの URL のまま（2026-10-21、船長）。
  const [y, m] = [parts[1], parts[2]];
  if (/^\d{4}$/.test(y) && /^\d{2}$/.test(m) && Number(y + m) >= DATED_FROM) {
    return `${top}/${y}/${m}/${githubSlug(filename)}`;
  }
  return `${top}/${githubSlug(filename)}`;
}

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog', generateId }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lang: z.enum(['en', 'es', 'ja']),
    excerpt: z.string().optional(),
    hero: z.string().optional(),
    category: z.array(z.string()).min(1).max(2).optional(),
    // その記事の「主」（エッセイを書いたAI・ログの主・船長）。category は種類、crew は誰か。JA は使わない。
    crew: z.string().optional(),
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog };
