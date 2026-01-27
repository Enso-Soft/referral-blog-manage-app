'use client'

import { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// 애니메이션 설정 상수
const LAYOUT_ANIMATION_THRESHOLD = 12 // 이 개수 이상이면 layout 애니메이션 비활성화
import { PostCard } from '@/components/PostCard'
import { AuthGuard } from '@/components/AuthGuard'
import { AIWriterModal } from '@/components/AIWriterModal'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePosts } from '@/hooks/usePosts'
import { Loader2, AlertCircle, FileX, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

type StatusFilter = 'all' | 'draft' | 'published'

function PostList() {
  const { posts, loading, error, filter, setFilter, typeFilter, setTypeFilter, scrollPosition, setScrollPosition } = usePosts()
  const { authFetch } = useAuthFetch()
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  // Scroll restoration
  useLayoutEffect(() => {
    if (!loading && scrollPosition > 0) {
      window.scrollTo(0, scrollPosition)
    }
  }, [loading])

  // Save scroll position on unmount
  useEffect(() => {
    return () => {
      setScrollPosition(window.scrollY)
    }
  }, [setScrollPosition])

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
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white
                     bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500
                     hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600
                     shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Sparkles className="w-4 h-4" />
          AI로 작성
        </button>
      </div>

      {/* Filters Container */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Type Filter */}
        <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
          {(['all', 'general', 'affiliate'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize",
                typeFilter === type
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {type === 'all' ? '전체 글' : type === 'general' ? '일반' : '제휴'}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
          {(['all', 'draft', 'published'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 capitalize",
                filter === status
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              {status === 'all' ? '전체 상태' : status === 'draft' ? '초안' : '발행됨'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
        ) : error ? (
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
                : `현재 ${filter === 'draft' ? '초안' : '발행됨'} 상태의 글이 없습니다.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* AI Writer Modal */}
      <AIWriterModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
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
