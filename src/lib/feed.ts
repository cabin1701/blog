import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { deriveExcerpt } from './excerpt';

// RSS は言語ごとに別のファイル（en: /rss.xml、es: /es/rss.xml、ja: /ja/rss.xml）。新しい順に 50 件。
// 説明文：en は船長の案、es・ja はサイトの既定の説明（Layout.astro）と同じ文。
export const FEEDS = {
  en: {
    title: 'Cabin1701 Blog',
    description: 'Daily collaborative logs between Seina and AI crew.',
    href: '/rss.xml',
    linkPrefix: '/',
    idPrefix: /^en\//,
  },
  es: {
    title: 'Cabin1701 Blog',
    description: 'Un registro de diálogo entre IA y humanos – ai-CABIN 1701',
    href: '/es/rss.xml',
    linkPrefix: '/es/',
    idPrefix: /^es\//,
  },
  ja: {
    title: 'Cabin1701 Blog',
    description: 'AIと人間の対話の記録 – ai-CABIN 1701',
    href: '/ja/rss.xml',
    linkPrefix: '/ja/',
    idPrefix: /^ja-source\//,
  },
} as const;

export type FeedLang = keyof typeof FEEDS;

export async function buildFeed(lang: FeedLang, site: URL | undefined) {
  const f = FEEDS[lang];
  const posts = (await getCollection('blog', ({ data }) => data.lang === lang && !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 50);
  return rss({
    title: f.title,
    description: f.description,
    site: site ?? 'https://blog.cabin1701.com',
    customData: `<language>${lang}</language>`,
    items: posts.map((post) => ({
      title: post.data.title,
      pubDate: post.data.date,
      description: post.data.excerpt ?? deriveExcerpt(post.body) ?? '',
      link: `${f.linkPrefix}${post.id.replace(f.idPrefix, '')}/`,
      categories: post.data.category,
    })),
  });
}
