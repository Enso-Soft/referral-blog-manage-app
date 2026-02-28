/**
 * 제네릭 TTL(Time-To-Live) 캐시
 * 서버 사이드에서 인메모리 캐싱에 사용
 */
export class TTLCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>()

  constructor(
    private ttlMs: number,
    private maxSize: number = 1000,
    private evictCount: number = 100
  ) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined
    if (Date.now() >= entry.expiry) {
      this.cache.delete(key)
      return undefined
    }
    return entry.value
  }

  set(key: string, value: T): void {
    this.evictIfNeeded()
    this.cache.set(key, { value, expiry: Date.now() + this.ttlMs })
  }

  has(key: string): boolean {
    return this.get(key) !== undefined
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }

  private evictIfNeeded(): void {
    if (this.cache.size < this.maxSize) return
    let removed = 0
    for (const key of this.cache.keys()) {
      if (removed >= this.evictCount) break
      this.cache.delete(key)
      removed++
    }
  }
}
