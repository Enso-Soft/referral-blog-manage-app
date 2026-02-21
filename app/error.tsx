'use client'

import { useEffect } from 'react'
import { ErrorFallback } from '@/components/layout/ErrorBoundary'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * 앱 레벨 에러 페이지
 * Next.js App Router의 error.tsx 규칙을 따릅니다.
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // 에러 로깅 (프로덕션에서는 에러 모니터링 서비스로 전송)
    console.error('App error:', error)
  }, [error])

  return <ErrorFallback error={error} reset={reset} />
}
