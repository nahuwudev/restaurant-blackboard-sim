export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let z = t;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}

export function nextInt(
  min: number,
  max: number,
  rng: () => number = Math.random,
): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function choice<T>(
  array: readonly T[],
  rng: () => number = Math.random,
): T {
  if (array.length === 0) {
    throw new Error("Cannot choose from an empty array");
  }
  const index = Math.floor(rng() * array.length);
  return array[index]!;
}

export function shuffle<T>(array: readonly T[], rng: () => number = Math.random): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1)); 
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}
