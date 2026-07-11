import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';
import { slug as githubSlug } from 'github-slugger';

// Ignore intermediate folders (e.g. year subfolders used for filesystem organization)
// so the entry id/slug depends only on the top-level lang folder + filename, never on
// how deep the file is nested. This keeps published URLs stable even if files get
// reorganized into subfolders later.
function generateId({ entry }: { entry: string }) {
  const parts = entry.split('/');
  const top = parts[0];
  const filename = parts[parts.length - 1].replace(/\.md$/, '');
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
    tags: z.array(z.string()).optional(),
    author: z.string().optional(),
    draft: z.boolean().optional(),
  }),
});

export const collections = { blog };
