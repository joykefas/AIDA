export const EMBEDDING_DIM = 1536;

/** Deterministic placeholder vector so the pgvector similarity-search codepath
 * is exercised end-to-end without a real embeddings API. Swap for a live
 * embeddings call alongside LlmProvider once real semantic quality matters. */
export function pseudoEmbedding(text: string): number[] {
  let seed = 0;
  for (let i = 0; i < text.length; i++)
    seed = (Math.imul(31, seed) + text.charCodeAt(i)) | 0;
  const vector: number[] = [];
  for (let i = 0; i < EMBEDDING_DIM; i++) {
    seed = (Math.imul(1103515245, seed) + 12345) | 0;
    vector.push(((seed >>> 0) % 2000) / 1000 - 1); // roughly [-1, 1]
  }
  return vector;
}

export function chunkText(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size)
    chunks.push(text.slice(i, i + size));
  return chunks.length > 0 ? chunks : [text];
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(',')}]`;
}
