import { useCallback } from 'react'
import { useAuth } from '@/components/layout/AuthProvider'

export function useAuthFetch() {
  const { getAuthToken } = useAuth()

  /**
   * 인증 토큰이 포함된 fetch 요청
   * 기본 fetch와 동일하게 동작하며, Response를 반환
   */
  const authFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = await getAuthToken()

      const headers = new Headers(options.headers)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }

      return fetch(url, {
        ...options,
        headers,
      })
    },
    [getAuthToken]
  )

  return { authFetch }
}
