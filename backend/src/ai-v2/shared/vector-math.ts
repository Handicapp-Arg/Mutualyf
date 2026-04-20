export type Vec = Float32Array;

export function cosine(a: Vec, b: Vec): number {
  const n = Math.min(a.length, b.length);
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function meanPool(vectors: Vec[]): Vec {
  if (vectors.length === 0) return new Float32Array();
  const n = vectors[0].length;
  const out = new Float32Array(n);
  for (const v of vectors) {
    for (let i = 0; i < n; i++) out[i] += v[i];
  }
  for (let i = 0; i < n; i++) out[i] /= vectors.length;
  return out;
}

export function toPgvector(v: Vec | number[]): string {
  const arr = v instanceof Float32Array ? Array.from(v) : v;
  return `[${arr.join(',')}]`;
}

export function fromBuffer(buf: Buffer): Vec {
  return new Float32Array(
    buf.buffer,
    buf.byteOffset,
    buf.byteLength / Float32Array.BYTES_PER_ELEMENT,
  );
}

export function toBuffer(v: Vec): Buffer {
  return Buffer.from(v.buffer, v.byteOffset, v.byteLength);
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(((p / 100) * (sorted.length - 1)) | 0);
  return sorted[idx];
}

export function kmeans(
  vectors: Vec[],
  k: number,
  iterations = 20,
): { centroids: Vec[]; assignments: number[] } {
  if (vectors.length === 0 || k <= 0) {
    return { centroids: [], assignments: [] };
  }
  const dims = vectors[0].length;
  const centroids: Vec[] = [];
  const picks = new Set<number>();
  while (centroids.length < Math.min(k, vectors.length)) {
    const i = Math.floor(Math.random() * vectors.length);
    if (picks.has(i)) continue;
    picks.add(i);
    centroids.push(new Float32Array(vectors[i]));
  }
  const assignments = new Array<number>(vectors.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    let moved = false;
    for (let i = 0; i < vectors.length; i++) {
      let best = 0,
        bestSim = -Infinity;
      for (let c = 0; c < centroids.length; c++) {
        const s = cosine(vectors[i], centroids[c]);
        if (s > bestSim) {
          bestSim = s;
          best = c;
        }
      }
      if (assignments[i] !== best) {
        assignments[i] = best;
        moved = true;
      }
    }
    const counts = new Array<number>(centroids.length).fill(0);
    const sums: Float32Array[] = centroids.map(() => new Float32Array(dims));
    for (let i = 0; i < vectors.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < dims; d++) sums[c][d] += vectors[i][d];
    }
    for (let c = 0; c < centroids.length; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d < dims; d++) sums[c][d] /= counts[c];
      centroids[c] = sums[c];
    }
    if (!moved) break;
  }
  return { centroids, assignments };
}
