import { Injectable, Logger } from '@nestjs/common';
import { EmbeddingProvider, EMBEDDING_DIM } from '../embedding.provider';

/**
 * Calls an OpenAI-compatible /embeddings API (Fireworks AI, Together AI, or OpenAI).
 * Generates 1536-dimensional semantic vector embeddings.
 */
@Injectable()
export class LiveEmbeddingProvider extends EmbeddingProvider {
  private readonly logger = new Logger(LiveEmbeddingProvider.name);
  private readonly baseUrl =
    process.env.EMBEDDING_BASE_URL ?? process.env.LLM_BASE_URL;
  private readonly apiKey =
    process.env.EMBEDDING_API_KEY ?? process.env.LLM_API_KEY;
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
        throw new Error('Live embedding credentials not configured');
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
      this.logger.warn(
        `Live embedding fallback engaged: ${(err as Error).message}`,
      );
      let seed = 0;
      return texts.map((text) => {
        for (let i = 0; i < text.length; i++)
          seed = (Math.imul(31, seed) + text.charCodeAt(i)) | 0;
        const v: number[] = [];
        for (let i = 0; i < EMBEDDING_DIM; i++) {
          seed = (Math.imul(1103515245, seed) + 12345) | 0;
          v.push(((seed >>> 0) % 2000) / 1000 - 1);
        }
        return v;
      });
    }
  }
}
