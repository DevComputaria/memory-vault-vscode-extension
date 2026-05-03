function hashToUnitFloat(value: number): number {
  const normalized = (value % 1000003) / 1000003;
  return normalized * 2 - 1;
}

function simpleHash(text: string, seed: number): number {
  let h = 2166136261 ^ seed;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export class EmbeddingGenerator {
  private extractor: any;
  private initialized = false;
  private readonly dimension = 384;

  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const transformers = (await import('@xenova/transformers')) as any;
      const { env, pipeline } = transformers;
      env.allowRemoteModels = false;
      env.allowLocalModels = true;
      this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    } catch {
      this.extractor = null;
    }

    this.initialized = true;
  }

  async generate(text: string): Promise<Float32Array> {
    await this.init();

    if (!this.extractor) {
      return this.hashEmbedding(text);
    }

    try {
      const output = await this.extractor(text, {
        pooling: 'mean',
        normalize: true
      });
      const vector = output?.data ? Float32Array.from(output.data as Iterable<number>) : this.hashEmbedding(text);
      return this.normalize(vector);
    } catch {
      return this.hashEmbedding(text);
    }
  }

  private hashEmbedding(text: string): Float32Array {
    const out = new Float32Array(this.dimension);
    for (let i = 0; i < this.dimension; i++) {
      out[i] = hashToUnitFloat(simpleHash(text, i + 31));
    }
    return this.normalize(out);
  }

  normalize(v: Float32Array): Float32Array {
    let norm = 0;
    for (let i = 0; i < v.length; i++) {
      norm += v[i] * v[i];
    }
    const denom = Math.sqrt(norm) || 1;
    const normalized = new Float32Array(v.length);
    for (let i = 0; i < v.length; i++) {
      normalized[i] = v[i] / denom;
    }
    return normalized;
  }
}
