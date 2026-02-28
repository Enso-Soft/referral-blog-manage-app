import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchWithTimeout } from '@/lib/fetch-with-timeout'

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('정상 응답 반환', async () => {
    const mockResponse = new Response('ok', { status: 200 })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse)

    const response = await fetchWithTimeout('https://example.com')
    expect(response.status).toBe(200)
  })

  it('타임아웃 시 에러', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
    )

    const promise = fetchWithTimeout('https://example.com', { timeout: 5000 })
    vi.advanceTimersByTime(5001)

    await expect(promise).rejects.toThrow('타임아웃')
  })
})
