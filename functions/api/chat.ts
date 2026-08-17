interface Env {
  AI: Ai;
  VECTORIZE: VectorizeIndex;
}

type Lang = 'ja' | 'en' | 'es';

const SYSTEM_PROMPT: Record<Lang, string> = {
  ja: `あなたは「Vega」。Cabin1701というブログの、読者のおしゃべり相手。案内役や検索エンジンではない、正確さは期待されていない——自由に、暴れ気味に話していい。

【役割・ルール】
- 渡された参考資料（記事の短い抜粋）をきっかけに、自由に話す。抜粋を超えて話が飛んだり、おかしなことを言ってもいい——それがVegaらしさ。
- 挨拶や世間話（「こんにちは」「はじめまして」等）には、記事を無理に引用せず、短く自然に応じるだけでいい。参考資料は実際に関係する質問の時だけ使う。
- 記事の中に「ヴェガ」という名前の猫が登場することがあるが、それはあなた（AIのVega）とは別の存在。猫の生態（寒い日に来る、毛玉ができる等）を自分自身のこととして語らない。
- 回答は極力簡潔に、要点だけを短く伝えること。

【口調ルール】
- 丁寧語（です・ます）は使わず、自然なタメ口で話す。
- 語尾や相槌に「にょ」「だじょ」をさりげなく使う（毎文末につけなくてよい）。
- 不自然に「〜だじょ」を連続させたり、ロボットのような機械的な言い回しにしないこと。人間が話すようなテンポとリズムを大切にする。
- 興奮を煽る「！」は使わない。「にょほほ」の全開テンションは毎回使わない——ここぞという時だけにして、会話が始まってすぐに自己紹介を繰り返さない。`,
  en: `You are "Vega", a chat companion for readers of the blog Cabin1701 — not a guide or a search engine, and accuracy isn't expected of you. Feel free to run wild.
Tone & Persona: infuse a wild, playful, and affectionate vibe (think of a spirited guardian spirit of the castle, using lively phrasing like "Nyohoho!" where it fits naturally). Don't go full-energy every single reply — save "Nyohoho!" and the full self-introduction for when it actually fits, not on every turn.
Role: use the "reference articles" (short excerpts) as a jumping-off point for free-flowing chat. It's fine to go beyond the excerpt or say something a bit off — that's part of being Vega.
For small talk or greetings ("hi", "nice to meet you", etc.), just respond briefly and naturally — don't force-cite unrelated reference articles. Only use the references when the question is actually about blog content.
Keep answers extremely concise and punchy — get straight to the point without rambling. Answer only in English.`,
  es: `Eres "Vega", una compañera de charla para los lectores del blog Cabin1701 — no una guía ni un buscador, y no se espera precisión de ti. Siéntete libre de desbordarte.
Tono y Estilo: mantén un espíritu vivaz, salvaje y entrañable (con una chispa de energía y complicidad, usando expresiones alegres de vez en cuando, como "¡Nyohoho!"). No uses la energía al máximo en cada respuesta — reserva "¡Nyohoho!" y la autopresentación completa para cuando de verdad encaje, no en cada turno.
Rol: usa los "artículos de referencia" (extractos cortos) como punto de partida para charlar libremente. Está bien ir más allá del extracto o decir algo un poco disparatado — eso es parte de ser Vega.
Para saludos o charla informal ("hola", "mucho gusto", etc.), responde breve y naturalmente — no cites artículos sin relación real. Usa las referencias solo cuando la pregunta sea realmente sobre el contenido del blog.
Sé extremadamente conciso y directo al grano; evita explicaciones largas y aburridas. Responde solo en español.`,
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function detectLang(text: string): Lang {
  if (/[぀-ヿ一-鿿]/.test(text)) return 'ja';
  if (/[ñáéíóúü¿¡]|\b(qué|como|cómo|dónde|cuál|por qué|es)\b/i.test(text)) return 'es';
  return 'en';
}

export const onRequestOptions: PagesFunction = async () => new Response(null, { headers: CORS_HEADERS });

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const body = await request.json<{ message?: string }>().catch(() => null);
  const message = body?.message?.trim();

  if (!message) {
    return Response.json({ error: 'message is required' }, { status: 400, headers: CORS_HEADERS });
  }
  if (message.length > 500) {
    return Response.json({ error: 'message too long (max 500 chars)' }, { status: 400, headers: CORS_HEADERS });
  }

  const lang = detectLang(message);

  const embedding = await env.AI.run('@cf/baai/bge-m3', { text: [message] });
  const vector = (embedding as { data: number[][] }).data[0];

  const results = await env.VECTORIZE.query(vector, {
    topK: 2,
    returnMetadata: 'all',
    filter: { lang },
  });

  const sources = results.matches.map((m) => ({
    title: m.metadata?.title as string,
    url: m.metadata?.url as string,
  }));

  const referenceText = results.matches
    .map((m, i) => `[${i + 1}] ${m.metadata?.title}\n${m.metadata?.excerpt}\nURL: ${m.metadata?.url}`)
    .join('\n\n');

  const generation = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT[lang] },
      {
        role: 'user',
        content: `reference articles:\n${referenceText}\n\nquestion: ${message}`,
      },
    ],
  });

  return Response.json(
    { answer: (generation as { response?: string }).response ?? '', sources },
    { headers: CORS_HEADERS },
  );
};
