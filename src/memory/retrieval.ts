import { MemoryDatabase } from './database';
import { MemoryEntry } from './types';

export interface RetrievalResult {
  lexical: MemoryEntry[];
  semantic: Array<MemoryEntry & { score: number }>;
  merged: Array<MemoryEntry & { score?: number }>;
}

export class RetrievalService {
  constructor(private readonly db: MemoryDatabase) {}

  async search(project: string, query: string, limit = 8): Promise<RetrievalResult> {
    const lexical = this.db.lexicalSearch(project, query, limit);
    const semantic = await this.db.semanticSearch(project, query, limit, 0.52);

    const map = new Map<string, MemoryEntry & { score?: number }>();

    for (const item of lexical) {
      map.set(item.id, item);
    }

    for (const item of semantic) {
      map.set(item.id, item);
    }

    const merged = [...map.values()]
      .sort((a, b) => {
        const as = (a as any).score ?? 0;
        const bs = (b as any).score ?? 0;
        if (bs !== as) {
          return bs - as;
        }
        return b.createdAt - a.createdAt;
      })
      .slice(0, limit);

    return { lexical, semantic, merged };
  }
}
