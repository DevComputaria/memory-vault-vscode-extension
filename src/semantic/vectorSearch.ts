import { MemoryDatabase } from '../memory/database';
import { MemoryEntry } from '../memory/types';
import { EmbeddingGenerator } from '../memory/embeddings';
import { VectorIndex } from './vectorIndex';

export class OptimizedVectorSearch {
  private readonly index = new VectorIndex();
  private readonly embedder = new EmbeddingGenerator();

  constructor(private readonly db: MemoryDatabase) {}

  async search(
    query: string,
    project: string,
    limit = 6,
    threshold = 0.55
  ): Promise<Array<MemoryEntry & { score: number }>> {
    const q = await this.embedder.generate(query);

    let results = this.index.search(project, q, limit, threshold);
    if (results.length >= limit) {
      return results;
    }

    const latest = this.db.listRecent(project, 120).filter((m) => m.embedding);
    for (const item of latest) {
      this.index.add(project, item, item.embedding!);
    }

    results = this.index.search(project, q, limit, threshold);
    return results;
  }
}
