'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/layout/AuthProvider'
import { queryKeys } from '@/lib/query-client'
import type { CreatePostInput, UpdatePostInput, BlogPost } from '@/lib/schemas'

interface MutationContext {
  previousPost?: BlogPost
}

/**
 * 포스트 생성 mutation
 */
export function useCreatePost() {
  const { getAuthToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePostInput): Promise<{ id: string }> => {
      const token = await getAuthToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || '포스트 생성에 실패했습니다')
      }

      return response.json()
    },
    onSuccess: () => {
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}

/**
 * 포스트 수정 mutation
 */
export function useUpdatePost() {
  const { getAuthToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: UpdatePostInput
    }): Promise<void> => {
      const token = await getAuthToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || '포스트 수정에 실패했습니다')
      }
    },
    onSuccess: (_data, variables) => {
      // 해당 포스트 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: queryKeys.posts.detail(variables.id),
      })
      // 목록 캐시도 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}

/**
 * 포스트 삭제 mutation
 */
export function useDeletePost() {
  const { getAuthToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const token = await getAuthToken()
      if (!token) throw new Error('인증이 필요합니다')

      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || '포스트 삭제에 실패했습니다')
      }
    },
    onSuccess: (_data, id) => {
      // 해당 포스트 캐시 제거
      queryClient.removeQueries({ queryKey: queryKeys.posts.detail(id) })
      // 목록 캐시 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}

/**
 * 포스트 상태 토글 mutation (Optimistic Update)
 */
export function useTogglePostStatus() {
  const { getAuthToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; currentStatus: 'draft' | 'published' }, MutationContext>({
    mutationFn: async ({ id, currentStatus }) => {
      const token = await getAuthToken()
      if (!token) throw new Error('인증이 필요합니다')

      const newStatus = currentStatus === 'draft' ? 'published' : 'draft'

      const response = await fetch(`/api/posts/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.error || '상태 변경에 실패했습니다')
      }
    },
    // Optimistic Update
    onMutate: async ({ id, currentStatus }) => {
      // 진행 중인 쿼리 취소
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.detail(id) })
      await queryClient.cancelQueries({ queryKey: queryKeys.posts.lists() })

      // 이전 값 저장
      const previousPost = queryClient.getQueryData<BlogPost>(
        queryKeys.posts.detail(id)
      )

      // 새 상태로 낙관적 업데이트
      const newStatus = currentStatus === 'draft' ? 'published' : 'draft'

      if (previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(id), {
          ...previousPost,
          status: newStatus,
        })
      }

      return { previousPost }
    },
    // 에러 발생 시 롤백
    onError: (_error, { id }, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(queryKeys.posts.detail(id), context.previousPost)
      }
    },
    // 완료 후 캐시 무효화
    onSettled: (_data, _error, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.detail(id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.posts.lists() })
    },
  })
}
