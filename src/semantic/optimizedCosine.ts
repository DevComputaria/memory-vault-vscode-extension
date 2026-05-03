export class OptimizedCosine {
  private readonly UNROLL = 8;

  dotProduct(a: Float32Array, b: Float32Array): number {
    const len = Math.min(a.length, b.length);
    const unrollLen = len - (len % this.UNROLL);
    let sum = 0;
    let i = 0;

    for (; i < unrollLen; i += this.UNROLL) {
      sum +=
        a[i] * b[i] +
        a[i + 1] * b[i + 1] +
        a[i + 2] * b[i + 2] +
        a[i + 3] * b[i + 3] +
        a[i + 4] * b[i + 4] +
        a[i + 5] * b[i + 5] +
        a[i + 6] * b[i + 6] +
        a[i + 7] * b[i + 7];
    }

    for (; i < len; i++) {
      sum += a[i] * b[i];
    }

    return sum;
  }
}
