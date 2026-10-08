export function deepFreeze<T>(obj: T): Readonly<T> {
  if (obj === null || typeof obj !== "object") return obj;
  
  Object.getOwnPropertyNames(obj).forEach((name) => {
    const value = (obj as Record<string, unknown>)[name];
    if (value && typeof value === "object") {
      deepFreeze(value);
    }
  });
  
  return Object.freeze(obj);
}