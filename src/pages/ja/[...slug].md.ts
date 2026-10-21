import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { articleMarkdown, markdownResponse } from '../../lib/markdown';

export async function getStaticPaths() {
  const posts = await getCollection('blog', ({ data }) => data.lang === 'ja' && !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id.replace(/^ja-source\//, '') },
    props: { post },
  }));
}

export const GET = ({ props, params }: APIContext) => {
  const { post } = props as { post: Awaited<ReturnType<typeof getCollection<'blog'>>>[number] };
  return markdownResponse(
    articleMarkdown(`https://blog.cabin1701.com/ja/${params.slug}/`, post.data, post.body),
  );
};
