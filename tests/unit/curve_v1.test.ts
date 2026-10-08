import { describe, it, expect } from "bun:test";
import {
  inverse,
  linear,
  sigmoid,
  exponential,
} from "../../src/utility/curves";

describe("Ejecución común de algoritmos de curva", () => {
  it("debe retornar el mismo valor de entrada cuando se usa la curva lineal", () => {
    expect(linear(5)).toBe(5);
  });

  it("debe retornar el valor inverso de entral cuando se usa la curva inversa", () => {
    expect(inverse(0.2)).toBe(0.8);
  });

  it("debe aplastar valores extremos entre 0 y 1 usando la función sigmoide", () => {
    expect(sigmoid(100)).toBeCloseTo(1);
    expect(sigmoid(-100)).toBeCloseTo(0);
  });

  it("debe retornar la potencia del valor de entrada según la base y exponente dados", () => {
    expect(exponential(2, 2)).toBe(4);
  });
});
