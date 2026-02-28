'use client'

import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  sectionName?: string
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * 섹션별 에러 바운더리
 * 개별 섹션 크래시가 전체 앱을 다운시키지 않도록 격리
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[${this.props.sectionName ?? 'Section'}] Error:`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">
            {this.props.sectionName ? `${this.props.sectionName} 로딩 중 오류가 발생했습니다.` : '오류가 발생했습니다.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            className="mt-2 text-xs text-red-500 hover:text-red-700 underline"
          >
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
