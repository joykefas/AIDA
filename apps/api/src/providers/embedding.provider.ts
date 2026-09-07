import { Injectable } from '@nestjs/common';

export const EMBEDDING_DIM = 1536;

@Injectable()
export abstract class EmbeddingProvider {
  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
}
