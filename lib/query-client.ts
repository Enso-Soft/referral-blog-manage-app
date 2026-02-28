import { QueryClient } from '@tanstack/react-query'

/**
 * TanStack Query 기본 설정
 *
 * staleTime: 데이터가 "stale" 상태가 되기까지의 시간
 * gcTime: 사용되지 않는 캐시 데이터가 가비지 컬렉션되기까지의 시간
 */
export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // 데이터가 5분간 fresh 상태 유지
        staleTime: 5 * 60 * 1000,
        // 캐시된 데이터 30분간 유지
        gcTime: 30 * 60 * 1000,
        // 윈도우 포커스 시 자동 refetch 비활성화 (Firestore 실시간 구독과 충돌 방지)
        refetchOnWindowFocus: false,
        // 네트워크 재연결 시 자동 refetch 비활성화
        refetchOnReconnect: false,
        // 마운트 시 자동 refetch 비활성화
        refetchOnMount: false,
        // 재시도 1회
        retry: 1,
      },
      mutations: {
        // mutation 실패 시 재시도 없음
        retry: false,
      },
    },
  })
}

// 쿼리 키 상수
export const queryKeys = {
  posts: {
    all: ['posts'] as const,
    lists: () => [...queryKeys.posts.all, 'list'] as const,
    list: (filters: { status?: string; platform?: string }) =>
      [...queryKeys.posts.lists(), filters] as const,
    details: () => [...queryKeys.posts.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.posts.details(), id] as const,
  },
  credits: {
    all: ['credits'] as const,
    balance: () => [...queryKeys.credits.all, 'balance'] as const,
    transactions: (type?: string) =>
      [...queryKeys.credits.all, 'transactions', type ?? null] as const,
  },
  hairstyleRequests: {
    all: ['hairstyle-requests'] as const,
  },
} as const
