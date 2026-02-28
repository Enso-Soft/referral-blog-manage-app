'use client'

import { ReactNode } from 'react'
import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeProvider'
import { PostsProvider } from '@/context/PostsProvider'
import { CreditProvider } from '@/context/CreditContext'
import { ErrorBoundary } from './ErrorBoundary'
import { QueryProvider } from '@/components/common/QueryProvider'
import { MotionConfig } from 'framer-motion'
import { Toaster } from 'sonner'

interface ProvidersProps {
  children: ReactNode
}

/**
 * 앱 전역 Provider들을 래핑하는 컴포넌트
 * ErrorBoundary로 클라이언트 측 에러도 처리
 * QueryProvider로 TanStack Query 캐싱 지원
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ThemeProvider>
        <MotionConfig reducedMotion="user">
          <ErrorBoundary>
            <CreditProvider>
              <AuthProvider>
                <PostsProvider>{children}</PostsProvider>
                <Toaster richColors position="bottom-right" />
              </AuthProvider>
            </CreditProvider>
          </ErrorBoundary>
        </MotionConfig>
      </ThemeProvider>
    </QueryProvider>
  )
}
