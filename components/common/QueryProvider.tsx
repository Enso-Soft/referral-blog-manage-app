'use client'

import { useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { makeQueryClient } from '@/lib/query-client'

interface QueryProviderProps {
  children: React.ReactNode
}

/**
 * TanStack Query Provider
 * 클라이언트 컴포넌트에서만 QueryClient 인스턴스 생성
 */
export function QueryProvider({ children }: QueryProviderProps) {
  // useState를 사용하여 클라이언트에서만 QueryClient 인스턴스 생성
  // SSR에서 리렌더링 시 새 인스턴스가 생성되는 것을 방지
  const [queryClient] = useState(() => makeQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
