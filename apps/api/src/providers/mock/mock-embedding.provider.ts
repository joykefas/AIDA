import { Injectable } from '@nestjs/common';
import { EmbeddingProvider, EMBEDDING_DIM } from '../embedding.provider';

@Injectable()
export class MockEmbeddingProvider extends EmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    await Promise.resolve();
    return this.generateDeterministicVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    await Promise.resolve();
    return texts.map((t) => this.generateDeterministicVector(t));
  }

  private generateDeterministicVector(text: string): number[] {
    let seed = 0;
    for (let i = 0; i < text.length; i++) {
      seed = (Math.imul(31, seed) + text.charCodeAt(i)) | 0;
    }
    const vector: number[] = [];
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      seed = (Math.imul(1103515245, seed) + 12345) | 0;
      vector.push(((seed >>> 0) % 2000) / 1000 - 1);
    }
    return vector;
  }
}
