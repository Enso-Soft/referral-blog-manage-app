/**
 * AbortController 기반 타임아웃 fetch 래퍼
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit & { timeout?: number }
): Promise<Response> {
  const { timeout = 30000, signal: callerSignal, ...fetchInit } = init ?? {}

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  // caller의 signal과 타임아웃 signal 합성
  const signal = callerSignal
    ? AbortSignal.any([controller.signal, callerSignal])
    : controller.signal

  try {
    const response = await fetch(input, {
      ...fetchInit,
      signal,
    })
    return response
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`요청이 ${timeout / 1000}초 후 타임아웃되었습니다.`)
    }
    throw error
  } finally {
    clearTimeout(id)
  }
}
