/**
 * Setup global para tests de vitest.
 *
 * Provee un mock de localStorage para entornos jsdom donde Bun/Node.js
 * no inicializa localStorage automáticamente (requeriría --localstorage-file).
 *
 * El mock es un Map en memoria que cumple la interfaz Storage completa.
 * Se resetea antes de cada test mediante `clearMocks: true` en vitest.config.ts.
 */

import { beforeEach } from 'vitest';

function createLocalStorageMock(): Storage {
  let store: Map<string, string> = new Map();

  return {
    get length() {
      return store.size;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store = new Map();
    },
  };
}

// Solo instalamos el mock si estamos en un entorno con `window` (jsdom)
// y localStorage no está disponible o está roto.
if (typeof window !== 'undefined') {
  const isLocalStorageBroken = (() => {
    try {
      return typeof localStorage === 'undefined' || localStorage === null;
    } catch {
      return true;
    }
  })();

  if (isLocalStorageBroken) {
    const mockStorage = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true,
    });
  }

  // Resetear localStorage antes de cada test para asegurar aislamiento.
  beforeEach(() => {
    try {
      localStorage.clear();
    } catch {
      // Si localStorage sigue sin funcionar, ignoramos silenciosamente.
    }
  });
}
