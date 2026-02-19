// File: src/lib/kv.ts

type KVValue = unknown;

export const kv = {
  async get<T = KVValue>(key: string): Promise<T | null> {
    try {
      const raw = localStorage.getItem(`speedsourcing:${key}`);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch (err) {
      console.error(`[kv.get] Failed for key "${key}"`, err);
      return null;
    }
  },

  async set(key: string, value: KVValue): Promise<void> {
    try {
      localStorage.setItem(
        `speedsourcing:${key}`,
        JSON.stringify(value)
      );
    } catch (err) {
      console.error(`[kv.set] Failed for key "${key}"`, err);
    }
  },

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(`speedsourcing:${key}`);
    } catch (err) {
      console.error(`[kv.delete] Failed for key "${key}"`, err);
    }
  },

  async clear(): Promise<void> {
    Object.keys(localStorage)
      .filter(k => k.startsWith("speedsourcing:"))
      .forEach(k => localStorage.removeItem(k));
  },
};