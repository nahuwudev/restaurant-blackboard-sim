
/* 

Lineal: y = x — proporcional al input. Usar para recursos que importan en proporción directa.
Inversa: y = 1 − x — más urgente cuando el input baja. Ideal para energía baja o inventario vacío.
Sigmoide: y = 1 / (1 + e^(−k·x)) — decisión con umbral claro. Usar cuando una condición importa mucho pasado cierto punto.
Exponencial: y = x^n — importancia crece rápido al final del rango. Para situaciones críticas.


*/

export function linear(x: number, factor: number = 1): number { 
  return x * factor;
}

export function inverse(x: number): number { 
    return 1 - x;
}

export function sigmoid(x: number, k: number = 1): number { 
  return 1 / (1 + Math.exp(-k * x));
}

export function exponential(x: number, n: number): number { 
    return x ** n
}