import { describe, it, expect } from "bun:test";
import { createRng, nextInt, choice, shuffle } from "../../src/core/helpers/rng";

describe("RNG", () => {
  it("la misma semilla produce la misma secuencia de 10 números", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const seq1 = Array.from({ length: 10 }, () => rng1());
    const seq2 = Array.from({ length: 10 }, () => rng2());

    expect(seq1).toEqual(seq2);
  });

  it("semillas distintas producen secuencias distintas", () => {
    const rng1 = createRng(42);
    const rng2 = createRng(100);

    expect(rng1()).not.toBe(rng2());
  });

  it("1000 llamadas caen estrictamente en el rango [0, 1)", () => {
    const rng = createRng(123);
    for (let i = 0; i < 1000; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it("nextInt respeta los límites usando funciones inyectadas para los extremos", () => {
    const fakeMinRng = () => 0; // Debe dar el mínimo
    const fakeMaxRng = () => 0.9999; // Debe dar el máximo

    expect(nextInt(1, 10, fakeMinRng)).toBe(1);
    expect(nextInt(1, 10, fakeMaxRng)).toBe(10);
  });

  it("choice solo devuelve elementos del array y lanza error si está vacío", () => {
    const items = ["a", "b", "c"];
    const rng = createRng(42);

    for (let i = 0; i < 50; i++) {
      const chosen = choice(items, rng);
      expect(items).toContain(chosen);
    }

    expect(() => choice([], rng)).toThrow("Cannot choose from an empty array");
  });

it("shuffle no muta el original, contiene los mismos elementos y es determinista con semilla", () => {
    const original = [1, 2, 3, 4, 5];
    const rng1 = createRng(42);
    const rng2 = createRng(42);

    const shuffled1 = shuffle(original, rng1);
    const shuffled2 = shuffle(original, rng2);

    expect(original).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled1].sort()).toEqual([...original].sort()); 
    expect(shuffled1).toEqual(shuffled2); 
  });
});