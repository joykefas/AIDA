import { chunkText, toVectorLiteral, EMBEDDING_DIM } from './embeddings.util';
import { MockEmbeddingProvider } from '../providers/mock/mock-embedding.provider';

describe('Document Embeddings & Chunking', () => {
  describe('chunkText', () => {
    it('should return single chunk if text is smaller than chunk size', () => {
      const text = 'Short paragraph for learning.';
      const chunks = chunkText(text, 500);
      expect(chunks).toEqual([text]);
    });

    it('should partition long text into uniform size slices', () => {
      const text = 'A'.repeat(1250);
      const chunks = chunkText(text, 500);
      expect(chunks.length).toBe(3);
      expect(chunks[0].length).toBe(500);
      expect(chunks[1].length).toBe(500);
      expect(chunks[2].length).toBe(250);
      expect(chunks.join('')).toBe(text);
    });

    it('should handle empty string gracefully', () => {
      const chunks = chunkText('', 500);
      expect(chunks).toEqual(['']);
    });
  });

  describe('toVectorLiteral', () => {
    it('should format floating point numbers into pgvector bracket notation', () => {
      const vec = [0.123, -0.456, 0.789];
      expect(toVectorLiteral(vec)).toBe('[0.123,-0.456,0.789]');
    });
  });

  describe('Embedding Provider Vector Generation', () => {
    const provider = new MockEmbeddingProvider();

    it('should generate vector of exactly EMBEDDING_DIM length (1536)', async () => {
      const vector = await provider.embed(
        'Cellular respiration involves glycolysis, citric acid cycle, and ETC.',
      );
      expect(vector.length).toBe(EMBEDDING_DIM);
      for (const val of vector) {
        expect(typeof val).toBe('number');
        expect(val).toBeGreaterThanOrEqual(-1.0);
        expect(val).toBeLessThanOrEqual(1.0);
      }
    });

    it('should batch embed multiple texts preserving order and dimension', async () => {
      const inputs = ['First topic', 'Second topic', 'Third topic'];
      const batch = await provider.embedBatch(inputs);
      expect(batch.length).toBe(3);
      expect(batch[0].length).toBe(EMBEDDING_DIM);
      expect(batch[1].length).toBe(EMBEDDING_DIM);
      expect(batch[2].length).toBe(EMBEDDING_DIM);
    });

    it('should be deterministic for identical input', async () => {
      const vec1 = await provider.embed('Identical input text');
      const vec2 = await provider.embed('Identical input text');
      expect(vec1).toEqual(vec2);
    });

    it('should generate distinct vectors for different inputs', async () => {
      const vecA = await provider.embed(
        'Mitochondria is the powerhouse of the cell',
      );
      const vecB = await provider.embed(
        'Newtonian mechanics principles of gravitation',
      );
      expect(vecA).not.toEqual(vecB);
    });
  });
});
