import { describe, it, expect } from 'vitest';
import { OptimizedCosine } from '../semantic/optimizedCosine';

describe('OptimizedCosine', () => {
  const cosine = new OptimizedCosine();

  it('deve calcular dot product corretamente (vetores normalizados)', () => {
    const a = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const b = new Float32Array([0.5, 0.5, 0.5, 0.5]);
    const result = cosine.dotProduct(a, b);
    expect(result).toBeCloseTo(1.0, 5);
  });

  it('deve lidar com vetores ortogonais', () => {
    const a = new Float32Array([1, 0, 0, 0]);
    const b = new Float32Array([0, 1, 0, 0]);
    const result = cosine.dotProduct(a, b);
    expect(result).toBeCloseTo(0, 5);
  });
});
