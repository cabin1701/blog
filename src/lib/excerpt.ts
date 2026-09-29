/**
 * 記事本文から meta description / og:description 用の抜粋を作る。
 *
 * frontmatter の excerpt が無い記事（2026-07 時点で ja 1295 本すべて）は、
 * これまで全ページ共通の既定文が入っていた。SNS に貼った時に
 * どの記事も同じ説明文になるため、本文の冒頭から生成する。
 */
export function deriveExcerpt(body: string | undefined, maxLen = 110): string | undefined {
  if (!body) return undefined;

  const text = body
    // 画像・リンク
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // HTML タグ
    .replace(/<[^>]+>/g, '')
    // コードブロック
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]*)`/g, '$1')
    // 見出し・引用・リスト・水平線の記号
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}(-{3,}|\*{3,}|_{3,})\s*$/gm, '')
    // 強調記号
    .replace(/\*\*([^*]*)\*\*/g, '$1')
    .replace(/\*([^*]*)\*/g, '$1')
    .replace(/__([^_]*)__/g, '$1')
    // 空白の整理
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return undefined;
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + '…';
}

/**
 * 一覧カード用の抜粋（2026-09-29）。過去の記事は frontmatter の excerpt が無いので、本文の書き出しから作る。
 * 本文の先頭に、日付・筆者名の行、AIブランド名とモデル名の行、記号だけの飾りの行が付いている記事が多いので、
 * 先頭のそれらを飛ばしてから deriveExcerpt に渡す。記事の本文そのものは変えない（表示用の抜粋だけ）。
 */
export function cardExcerpt(body: string | undefined, maxLen = 110): string | undefined {
  if (!body) return undefined;
  const lines = body.split('\n');
  const isNoise = (l: string) => {
    const t = l.replace(/[*_]/g, '').trim(); // **太字** の記号は外して見る
    if (!t) return true;
    if (/\\/.test(t) && t.replace(/[\\\s]/g, '').length < 40) return true; // \ \ \ の飾り
    if (/^#{1,6}\s/.test(t)) return true; // 見出し行
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(t) && t.length < 60) return true; // 日付（＋筆者名）の行
    if (/^(Captain Seina|Seina|Frankie|Vega|Eddie|Issac|David)$/i.test(t)) return true;
    if (t.length < 70 && /^(Claude|Copilot|Gemini|ChatGPT|GPT|Grok|Meta|Llama)\b/i.test(t) && !/[.!?。]$/.test(t)) return true; // モデル名の行
    return false;
  };
  let i = 0;
  while (i < lines.length && i < 8 && isNoise(lines[i])) i++;
  let text = lines
    .slice(i)
    .join('\n')
    .replace(/!\[[^\]]*\]\[[^\]]*\]/g, ' ') // 参照形式の画像 ![][image1]
    .replace(/(\\\s*)+/g, ' ');
  // 文の頭に付いている「日付＋筆者名」「モデル名」「筆者名.」を飛ばす（最大3回）
  const NAMES = '(?:Captain Seina|Seina|Frankie|Vega|Eddie|Issac|David|Tammy)';
  const prefixes = [
    new RegExp('^\\s*\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}\\s+' + NAMES + '(?:\\s*[-–]\\s*' + NAMES + ')?\\s+', 'i'),
    /^\s*(?:Claude\s+)?(?:Opus|Sonnet|Haiku)\s*(?:\d+(?:\.\d+)?)?\s*[.,:–-]?\s+/i,
    /^\s*(?:Copilot|Gemini|ChatGPT|Grok|Meta)\s*\([^)]*\)\s*/i,
    new RegExp('^\\s*' + NAMES + '\\.\\s+', 'i'),
    /^\s*Vega['’]s Room\s+/i,
  ];
  for (let n = 0; n < 3; n++) {
    let changed = false;
    for (const re of prefixes) {
      if (re.test(text)) { text = text.replace(re, ''); changed = true; }
    }
    if (!changed) break;
  }
  return deriveExcerpt(text, maxLen);
}
