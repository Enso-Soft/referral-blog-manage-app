'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type RefCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 애니메이션 설정 상수
const LAYOUT_ANIMATION_THRESHOLD = 12 // 이 개수 이상이면 layout 애니메이션 비활성화
import { PostCard } from '@/components/post/PostCard'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { AIWriterModal } from '@/components/ai/AIWriterModal'
import { AIRequestSection } from '@/components/ai/AIRequestCard'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePosts } from '@/hooks/usePosts'
import { useAIWriteRequests } from '@/hooks/useAIWriteRequests'
import { Loader2, AlertCircle, FileX, Sparkles, LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AIWriteRequest } from '@/lib/schemas/aiRequest'

type StatusFilter = 'all' | 'draft' | 'published'
type ViewMode = 'grid' | 'list'

const VIEW_MODE_STORAGE_KEY = 'post-list-view-mode'

function PostList() {
  const { posts, loading, error, filter, setFilter, typeFilter, setTypeFilter, loadingMore, hasMore, loadMore } = usePosts()
  const { authFetch } = useAuthFetch()
  const { requests: aiRequests, latestCompletedRequest, clearLatestCompleted } = useAIWriteRequests()
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)
  const [retryData, setRetryData] = useState<AIWriteRequest | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid'
    return (localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode) || 'grid'
  })

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }, [])

  // 무한스크롤: callback ref로 DOM mount/unmount를 정확히 추적
  const loadMoreRef = useRef(loadMore)
  loadMoreRef.current = loadMore
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelRef: RefCallback<HTMLDivElement> = useCallback((node) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    if (!node) return
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) loadMoreRef.current()
      },
      { rootMargin: '200px' }
    )
    observerRef.current.observe(node)
  }, [])

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set())

  const activeAIRequests = useMemo(() => {
    return aiRequests.filter(r => !r.dismissed && !hiddenIds.has(r.id))
  }, [aiRequests, hiddenIds])

  // 드래프트 필터일 때는 AI 요청 섹션 숨김
  const showAIRequestSection = activeAIRequests.length > 0

  // AI 요청 숨김 핸들러
  const handleAIRequestDismiss = useCallback(async (requestId: string) => {
    setHiddenIds(prev => new Set(prev).add(requestId))
    try {
      const res = await authFetch('/api/ai/blog-writer', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: requestId }),
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || '숨김 처리에 실패했습니다')
      }
    } catch (err) {
      console.error('Failed to dismiss AI request:', err)
      setHiddenIds(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
      throw err
    }
  }, [authFetch])

  // AI 요청 삭제 핸들러
  const handleAIRequestDelete = useCallback(async (requestId: string) => {
    setHiddenIds(prev => new Set(prev).add(requestId))
    try {
      const res = await authFetch(`/api/ai/blog-writer?id=${requestId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || '삭제에 실패했습니다')
      }
    } catch (err) {
      console.error('Failed to delete AI request:', err)
      setHiddenIds(prev => {
        const next = new Set(prev)
        next.delete(requestId)
        return next
      })
      throw err
    }
  }, [authFetch])

  // AI 요청 재시도 핸들러 (모달 열고 폼 복원)
  const handleAIRequestRetry = useCallback((request: AIWriteRequest) => {
    setRetryData(request)
    setIsAIModalOpen(true)
  }, [])

  // AI 요청 카드 클릭 핸들러 (실패한 요청만 모달 열기)
  const handleAIRequestClick = useCallback((request: AIWriteRequest) => {
    if (request.status === 'failed') {
      setRetryData(request)
      setIsAIModalOpen(true)
    }
  }, [])


  // 모달 닫을 때 retryData 초기화
  const handleCloseModal = useCallback(() => {
    setIsAIModalOpen(false)
    setRetryData(null)
  }, [])

  // 포스트 클릭 시 스크롤 위치 저장 (캡처 단계에서 네비게이션 전에 기록)
  const handleSaveScroll = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    sessionStorage.setItem('list-scroll-pos', String(window.scrollY))
  }, [])

  // 스크롤 위치 복원 (sessionStorage 기반)
  useEffect(() => {
    if (!loading) {
      const saved = sessionStorage.getItem('list-scroll-pos')
      if (saved) {
        sessionStorage.removeItem('list-scroll-pos')
        const pos = parseInt(saved, 10)
        if (pos > 0) {
          requestAnimationFrame(() => {
            window.scrollTo(0, pos)
          })
        }
      }
    }
  }, [loading])

  const handleStatusChange = useCallback(async (postId: string, newStatus: 'draft' | 'published'): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      return data.success
    } catch {
      return false
    }
  }, [authFetch])

  const handleTypeChange = useCallback(async (postId: string, newType: 'general' | 'affiliate'): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postType: newType }),
      })
      const data = await res.json()
      return data.success
    } catch {
      return false
    }
  }, [authFetch])

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">블로그 글 목록</h1>
          <p className="text-muted-foreground mt-2 text-lg">블로그 콘텐츠를 관리하고 편집합니다.</p>
        </div>
        <Button
          onClick={() => setIsAIModalOpen(true)}
          className="rounded-xl font-semibold px-5 py-2.5 h-auto bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          AI로 작성
        </Button>
      </div>

      {/* AI Request Section + Filters Container */}
      <div className="space-y-4">
        {/* AI Request Section - 필터 위에 배치 */}
        <AnimatePresence>
          {showAIRequestSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{ overflow: 'hidden' }}
            >
              <AIRequestSection
                requests={activeAIRequests}
                onRetry={handleAIRequestRetry}
                onDelete={handleAIRequestDelete}
                onDismiss={handleAIRequestDismiss}
                onClick={handleAIRequestClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex items-center">
          {/* Left: Filter Groups */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Type Filter */}
            <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
              {(['all', 'general', 'affiliate'] as const).map((type) => (
                <Button
                  key={type}
                  variant="ghost"
                  size="sm"
                  onClick={() => setTypeFilter(type)}
                  className={cn(
                    "rounded-lg capitalize",
                    typeFilter === type
                      ? "bg-background text-foreground shadow-sm hover:bg-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {type === 'all' ? '전체 글' : type === 'general' ? '일반' : '제휴'}
                </Button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
              {(['all', 'draft', 'published'] as const).map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(status)}
                  className={cn(
                    "rounded-lg capitalize",
                    filter === status
                      ? "bg-background text-foreground shadow-sm hover:bg-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {status === 'all' ? '전체 상태' : status === 'draft' ? '미발행' : '발행됨'}
                </Button>
              ))}
            </div>
          </div>

          {/* Right: View Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit ml-auto self-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              className={cn(
                "rounded-lg",
                viewMode === 'grid'
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewModeChange('list')}
              className={cn(
                "rounded-lg",
                viewMode === 'list'
                  ? "bg-background text-foreground shadow-sm hover:bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="h-[380px] rounded-2xl bg-card border border-border shadow-sm p-4 space-y-4 animate-pulse">
                <div className="w-full h-48 bg-secondary rounded-xl" />
                <div className="space-y-2">
                  <div className="h-6 w-3/4 bg-secondary rounded" />
                  <div className="h-4 w-full bg-secondary/60 rounded" />
                  <div className="h-4 w-2/3 bg-secondary/60 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}
        {loading && viewMode === 'list' && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex items-center gap-0 h-[90px] rounded-2xl bg-card border border-border overflow-hidden animate-pulse">
                <div className="w-[160px] h-full bg-secondary shrink-0" />
                <div className="flex-1 px-4 py-3 flex flex-col gap-2">
                  <div className="h-4 w-3/4 bg-secondary rounded" />
                  <div className="h-3 w-1/3 bg-secondary/60 rounded" />
                </div>
                <div className="px-4 flex gap-2 shrink-0">
                  <div className="h-7 w-16 bg-secondary rounded-lg" />
                  <div className="h-7 w-16 bg-secondary rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!loading && (
          error ? (
            <div className="flex flex-col items-center justify-center py-20 text-destructive bg-destructive/5 rounded-2xl border border-destructive/20">
              <AlertCircle className="w-10 h-10 mb-3" />
              <span className="font-medium">{error}</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-muted-foreground bg-secondary/20 rounded-3xl border border-dashed border-border">
              <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
                <FileX className="w-8 h-8 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">등록된 글이 없습니다</h3>
              <p className="max-w-xs text-center mt-1">
                {filter === 'all'
                  ? "첫 번째 블로그 글을 작성해보세요."
                  : `현재 ${filter === 'draft' ? '미발행' : '발행됨'} 상태의 글이 없습니다.`}
              </p>
            </div>
          ) : (
            <div
              key={viewMode}
              onClickCapture={handleSaveScroll}
              className={viewMode === 'grid'
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                : "space-y-3"
              }
            >
              <AnimatePresence mode="popLayout">
                {posts.map((post) => (
                  <motion.div
                    key={post.id}
                    layout={posts.length < LAYOUT_ANIMATION_THRESHOLD}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <PostCard
                      post={post}
                      onStatusChange={handleStatusChange}
                      onTypeChange={handleTypeChange}
                      viewMode={viewMode}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        )}

        {/* 무한스크롤 트리거 */}
        {!loading && hasMore && (
          <div ref={sentinelRef} className="flex justify-center pt-8 pb-4">
            {loadingMore && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          </div>
        )}
      </div>

      {/* AI Writer Modal */}
      <AIWriterModal
        isOpen={isAIModalOpen}
        onClose={handleCloseModal}
        retryData={retryData}
        latestCompletedRequest={latestCompletedRequest}
        clearLatestCompleted={clearLatestCompleted}
      />

    </div>
  )
}

export default function HomePage() {
  return (
    <AuthGuard>
      <div className="pb-20">
        <PostList />
      </div>
    </AuthGuard>
  )
}
