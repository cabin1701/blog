import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

// site（cabin1701.com）のトップページが実行時にfetchして「最新記事」セクションを描く。
// GitHub Pages は access-control-allow-origin: * を返すのでクロスオリジンfetchが通る。
const N = 6;
const SITE = 'https://blog.cabin1701.com';

const slugOf = (id: string) => id.replace(/^(en|es|ja-source)\//, '');
const urlFor = (lang: string, id: string) => {
  const slug = slugOf(id);
  return lang === 'en' ? `${SITE}/${slug}/` : `${SITE}/${lang}/${slug}/`;
};

const latest = (posts: Awaited<ReturnType<typeof getCollection>>, lang: string) =>
  posts
    .filter((p) => p.data.lang === lang)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, N)
    .map((p) => ({
      title: p.data.title,
      url: urlFor(lang, p.id),
      hero: p.data.hero ?? null,
      date: p.data.date.toISOString().slice(0, 10),
    }));

export const GET: APIRoute = async () => {
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  const payload = {
    en: latest(posts, 'en'),
    es: latest(posts, 'es'),
    ja: latest(posts, 'ja'),
  };
  return new Response(JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });
};
