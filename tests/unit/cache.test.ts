import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TTLCache } from '@/lib/cache'

describe('TTLCache', () => {
  let cache: TTLCache<string>

  beforeEach(() => {
    cache = new TTLCache<string>(1000) // 1초 TTL
  })

  it('set/get으로 값을 저장하고 조회', () => {
    cache.set('key1', 'value1')
    expect(cache.get('key1')).toBe('value1')
  })

  it('has로 존재 여부 확인', () => {
    cache.set('key1', 'value1')
    expect(cache.has('key1')).toBe(true)
    expect(cache.has('key2')).toBe(false)
  })

  it('TTL 만료 시 undefined 반환', () => {
    vi.useFakeTimers()
    cache.set('key1', 'value1')

    vi.advanceTimersByTime(500)
    expect(cache.get('key1')).toBe('value1')

    vi.advanceTimersByTime(600) // 총 1100ms
    expect(cache.get('key1')).toBeUndefined()

    vi.useRealTimers()
  })

  it('delete로 항목 제거', () => {
    cache.set('key1', 'value1')
    cache.delete('key1')
    expect(cache.get('key1')).toBeUndefined()
  })

  it('clear로 전체 초기화', () => {
    cache.set('key1', 'value1')
    cache.set('key2', 'value2')
    cache.clear()
    expect(cache.size).toBe(0)
  })

  it('maxSize 초과 시 eviction', () => {
    const smallCache = new TTLCache<string>(10000, 5, 3)

    for (let i = 0; i < 6; i++) {
      smallCache.set(`key${i}`, `value${i}`)
    }

    // maxSize(5) 초과 시 evictCount(3)만큼 제거
    expect(smallCache.size).toBeLessThanOrEqual(5)
  })
})
