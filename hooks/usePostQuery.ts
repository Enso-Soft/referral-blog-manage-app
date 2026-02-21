'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/components/layout/AuthProvider'
import { queryKeys } from '@/lib/query-client'
import type { BlogPost } from '@/lib/schemas'

async function fetchPost(token: string | null, postId: string): Promise<BlogPost> {
  if (!token) {
    throw new Error('인증이 필요합니다')
  }

  const response = await fetch(`/api/posts/${postId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    if (response.status === 404) {
      throw new Error('포스트를 찾을 수 없습니다')
    }
    if (response.status === 403) {
      throw new Error('이 포스트에 접근할 권한이 없습니다')
    }
    throw new Error(error.error || '포스트를 불러오는데 실패했습니다')
  }

  const data = await response.json()
  return data.post
}

/**
 * TanStack Query 기반 단일 포스트 조회 hook
 */
export function usePostQuery(postId: string | null) {
  const { getAuthToken, user, loading: authLoading } = useAuth()

  return useQuery({
    queryKey: queryKeys.posts.detail(postId || ''),
    queryFn: async () => {
      const token = await getAuthToken()
      return fetchPost(token, postId!)
    },
    enabled: !authLoading && !!user && !!postId,
  })
}
