import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { cardExcerpt } from '../../lib/excerpt';

// site（cabin1701.com）の /3500-minds/reports/ が実行時にfetchして一覧を描く。
// 対象：category か tags に「3,500 Minds」が入っている英語記事。新しい順。
const SITE = 'https://blog.cabin1701.com';
const KEY = '3,500 Minds';

const slugOf = (id: string) => id.replace(/^en\//, '');

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const items = posts
    .filter((p) => p.data.lang === 'en')
    .filter((p) => (p.data.category ?? []).includes(KEY) || (p.data.tags ?? []).includes(KEY))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((p) => ({
      title: p.data.title,
      url: `${SITE}/${slugOf(p.id)}/`,
      hero: p.data.hero ?? null,
      date: p.data.date.toISOString().slice(0, 10),
      category: p.data.category ?? [],
      tags: p.data.tags ?? [],
      crew: p.data.crew ?? null,
      excerpt: p.data.excerpt ?? cardExcerpt(p.body) ?? '',
    }));
  return new Response(JSON.stringify({ items }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
