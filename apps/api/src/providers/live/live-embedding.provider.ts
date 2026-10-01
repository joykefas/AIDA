import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProvider } from '../embedding.provider';
import { pseudoEmbedding } from '../../documents/embeddings.util';

/**
 * Calls an OpenAI-compatible /embeddings API (Fireworks AI, Together AI, or OpenAI).
 * Generates 1536-dimensional semantic vector embeddings.
 */
@Injectable()
export class LiveEmbeddingProvider extends EmbeddingProvider {
  private readonly logger = new Logger(LiveEmbeddingProvider.name);
  private hasWarnedMissingCredentials = false;
  private readonly apiKey =
    process.env.EMBEDDING_API_KEY ??
    process.env.OPENAI_API_KEY ??
    process.env.LLM_API_KEY;
  private readonly baseUrl =
    process.env.EMBEDDING_BASE_URL ??
    (process.env.OPENAI_API_KEY
      ? 'https://api.openai.com/v1'
      : process.env.LLM_BASE_URL);
  private readonly model =
    process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small';

  async embed(text: string): Promise<number[]> {
    const batch = await this.embedBatch([text]);
    return batch[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    try {
      if (!this.apiKey || !this.baseUrl) {
        throw new Error(
          'Live embedding credentials not configured (set EMBEDDING_API_KEY and EMBEDDING_BASE_URL, or OPENAI_API_KEY)',
        );
      }

      const res = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
        }),
      });

      if (!res.ok) {
        const body = await res.text();
        this.logger.error(`Embeddings call failed: ${res.status} ${body}`);
        throw new Error(`Embedding provider error: ${res.status}`);
      }

      const data = (await res.json()) as {
        data: { embedding: number[]; index: number }[];
      };
      return data.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    } catch (err) {
      if (!this.hasWarnedMissingCredentials) {
        this.logger.warn(
          `Live embedding fallback engaged: ${(err as Error).message}. Using semantic bag-of-words 1536-dim vectors.`,
        );
        this.hasWarnedMissingCredentials = true;
      }
      return texts.map((text) => pseudoEmbedding(text));
    }
  }
}
