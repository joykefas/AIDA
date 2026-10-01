export const EMBEDDING_DIM = 1536;

function hashWord(word: string): number {
  let h = 2166136261;
  for (let i = 0; i < word.length; i++) {
    h = Math.imul(h ^ word.charCodeAt(i), 16777619);
  }
  return Math.abs(h | 0);
}

/** Deterministic pseudo-vector embedding using bag-of-words feature hashing.
 * Texts sharing vocabulary share high cosine similarity, while unrelated texts
 * produce near-zero similarity. */
export function pseudoEmbedding(text: string): number[] {
  const vector: number[] = Array.from({ length: EMBEDDING_DIM }, () => 0);
  const words = text
    .toLowerCase()
    .replace(/[^\w]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (words.length === 0) {
    let seed = 0;
    for (let i = 0; i < text.length; i++)
      seed = (Math.imul(31, seed) + text.charCodeAt(i)) | 0;
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      seed = (Math.imul(1103515245, seed) + 12345) | 0;
      vector[i] = ((seed >>> 0) % 2000) / 1000 - 1;
    }
    return vector;
  }

  for (const w of words) {
    const idx = hashWord(w) % EMBEDDING_DIM;
    const sign = hashWord(w + '_sign') % 2 === 0 ? 1 : -1;
    vector[idx] += sign;
    const idx2 = hashWord(w + '_sub') % EMBEDDING_DIM;
    vector[idx2] += sign * 0.5;
  }

  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIM; i++) norm += vector[i] * vector[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIM; i++) vector[i] = vector[i] / norm;
  }
  return vector;
}

/** Exact slice partitioner preserved for backward compatibility and strict unit tests. */
export function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size)
    chunks.push(text.slice(i, i + size));
  return chunks.length > 0 ? chunks : [text];
}

/** Smart chunking splitting at natural boundaries (paragraphs, sentences, word boundaries)
 * with overlapping windows to prevent slicing definitions and thoughts in half. */
export function smartChunkText(
  text: string,
  targetSize = 1000,
  overlap = 200,
): string[] {
  if (!text) return [''];
  const trimmed = text.trim();
  if (trimmed.length <= targetSize) return [trimmed];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + targetSize;
    if (end >= text.length) {
      const remaining = text.slice(start).trim();
      if (remaining) chunks.push(remaining);
      break;
    }

    const windowStart = Math.max(start, end - 200);
    const windowEnd = Math.min(text.length, end + 100);
    const searchWindow = text.slice(windowStart, windowEnd);

    const lastDoubleNewline = searchWindow.lastIndexOf('\n\n');
    const lastPeriod = searchWindow.lastIndexOf('. ');
    const lastSingleNewline = searchWindow.lastIndexOf('\n');
    const lastSpace = searchWindow.lastIndexOf(' ');

    let breakPoint: number;
    if (lastDoubleNewline !== -1) {
      breakPoint = windowStart + lastDoubleNewline + 2;
    } else if (lastPeriod !== -1) {
      breakPoint = windowStart + lastPeriod + 2;
    } else if (lastSingleNewline !== -1) {
      breakPoint = windowStart + lastSingleNewline + 1;
    } else if (lastSpace !== -1) {
      breakPoint = windowStart + lastSpace + 1;
    } else {
      breakPoint = end;
    }

    const chunk = text.slice(start, breakPoint).trim();
    if (chunk) chunks.push(chunk);

    start = Math.max(start + 1, breakPoint - overlap);
    while (start < text.length && text[start] !== ' ' && text[start] !== '\n') {
      start++;
    }
    if (start < text.length) start++;
  }

  return chunks.length > 0 ? chunks : [trimmed];
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
