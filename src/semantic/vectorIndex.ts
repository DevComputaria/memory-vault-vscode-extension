import { MemoryEntry } from '../memory/types';
import { OptimizedCosine } from './optimizedCosine';

type IndexedMemory = MemoryEntry & { normalizedEmbedding: Float32Array };

export class VectorIndex {
  private readonly byProject = new Map<string, IndexedMemory[]>();
  private readonly cosine = new OptimizedCosine();
  private readonly maxPerProject = 2000;

  add(project: string, memory: MemoryEntry, normalizedEmbedding: Float32Array): void {
    if (!this.byProject.has(project)) {
      this.byProject.set(project, []);
    }

    const entries = this.byProject.get(project)!;
    entries.push({ ...memory, normalizedEmbedding });

    if (entries.length > this.maxPerProject) {
      entries.shift();
    }
  }

  search(
    project: string,
    queryNormalized: Float32Array,
    limit = 6,
    threshold = 0.6
  ): Array<MemoryEntry & { score: number }> {
    const entries = this.byProject.get(project) || [];

    const scored = entries
      .map((entry) => ({
        ...entry,
        score: this.cosine.dotProduct(queryNormalized, entry.normalizedEmbedding)
      }))
      .filter((entry) => entry.score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  clearProject(project: string): void {
    this.byProject.delete(project);
  }
}
