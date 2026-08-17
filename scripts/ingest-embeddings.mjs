// ja-source/en/es の記事をembeddingしてVectorize用のndjsonを作る。
// 実行: node scripts/ingest-embeddings.mjs [--years=2009,2010,2011] [--skip-en-es]
//   --years 省略時は2026のみ（ja/en/es全部）。指定するとja-sourceのそのyearsだけを処理する（en/esは2026分のみ、既存なので既定でスキップ）。
// 生成物: scripts/vectors.ndjson → `npx wrangler vectorize insert blog-2026 --file=scripts/vectors.ndjson` で投入する
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const ACCOUNT_ID = '009d2f3b104a624e78aafe0516533530';
const BLOG_DIR = fileURLToPath(new URL('../src/content/blog', import.meta.url));
const OUT_FILE = fileURLToPath(new URL('./vectors.ndjson', import.meta.url));
const SITE = 'https://blog.cabin1701.com';
const EMBED_BATCH = 5;

const args = process.argv.slice(2);
const yearsArg = args.find((a) => a.startsWith('--years='));
const YEARS = yearsArg ? yearsArg.slice('--years='.length).split(',') : ['2026'];
const includeEnEs = !yearsArg; // --years指定時はja-sourceの過去分だけを想定、en/esは既に2026分投入済みなのでスキップ

// lang: 収集元フォルダ（複数可） / prefix: idから取り除く接頭辞 / urlFor: 記事のURL組み立て
const COLLECTIONS = [
  { lang: 'ja', dirs: YEARS.map((y) => `ja-source/${y}`), prefix: 'ja-source/', urlFor: (slug) => `${SITE}/ja/${slug}/` },
  ...(includeEnEs
    ? [
        { lang: 'en', dirs: ['en/2026'], prefix: 'en/', urlFor: (slug) => `${SITE}/${slug}/` },
        { lang: 'es', dirs: ['es/2026'], prefix: 'es/', urlFor: (slug) => `${SITE}/es/${slug}/` },
      ]
    : []),
];

function getToken() {
  const configPath = join(process.env.HOME, 'Library/Preferences/.wrangler/config/default.toml');
  return readFile(configPath, 'utf-8').then((text) => {
    const m = text.match(/^oauth_token\s*=\s*"([^"]+)"/m);
    if (!m) throw new Error('oauth_token not found in wrangler config');
    return m[1];
  });
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(full)));
    else if (entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function parseFrontmatter(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error('frontmatter not found');
  const [, fm, body] = m;
  const data = {};
  for (const line of fm.split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, rawVal] = kv;
    data[key] = rawVal.replace(/^"(.*)"$/, '$1');
  }
  return { data, body: body.trim() };
}

function stripMarkdown(text) {
  return text
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/\[([^\]]*)\]\(.*?\)/g, '$1')
    .replace(/[*_#>`]/g, '')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

async function embedBatch(texts, token) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/baai/bge-m3`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts }),
    },
  );
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.errors));
  return json.result.data;
}

async function main() {
  const token = await getToken();

  const records = [];
  for (const col of COLLECTIONS) {
    const files = (await Promise.all(col.dirs.map((d) => walk(join(BLOG_DIR, d))))).flat();
    console.log(`${col.lang} (${col.dirs.join(', ')}): found ${files.length} articles`);
    for (const file of files) {
      const raw = await readFile(file, 'utf-8');
      const { data, body } = parseFrontmatter(raw);
      const relPath = relative(BLOG_DIR, file);
      const slug = relPath.replace(new RegExp(`^${col.prefix}`), '').replace(/\.md$/, '');
      const url = col.urlFor(slug);
      const excerpt = stripMarkdown(body).slice(0, 200);
      const embedText = `${data.title}\n\n${stripMarkdown(body)}`.slice(0, 6000);
      const id = createHash('sha1').update(`${col.lang}:${slug}`).digest('hex').slice(0, 32);
      records.push({ id, embedText, metadata: { lang: col.lang, title: data.title, url, date: data.date, excerpt } });
    }
  }

  const vectors = [];
  for (let i = 0; i < records.length; i += EMBED_BATCH) {
    const batch = records.slice(i, i + EMBED_BATCH);
    const embeddings = await embedBatch(batch.map((r) => r.embedText), token);
    batch.forEach((r, j) => {
      vectors.push({ id: r.id, values: embeddings[j], metadata: r.metadata });
    });
    console.log(`embedded ${Math.min(i + EMBED_BATCH, records.length)}/${records.length}`);
  }

  await writeFile(OUT_FILE, vectors.map((v) => JSON.stringify(v)).join('\n') + '\n');
  console.log(`wrote ${vectors.length} vectors to ${OUT_FILE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
