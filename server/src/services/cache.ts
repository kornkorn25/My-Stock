interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Tiny in-memory TTL cache. Swap for Redis later without changing callers. */
export class TtlCache<T> {
  private store = new Map<string, Entry<T>>();

  constructor(private ttlSeconds: number) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds = this.ttlSeconds): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
