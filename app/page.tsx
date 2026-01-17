'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PostCard } from '@/components/PostCard'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePosts } from '@/hooks/usePosts'
import { Loader2, AlertCircle, FileX } from 'lucide-react'

type StatusFilter = 'all' | 'draft' | 'published'

function PostList() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const { posts, loading, error } = usePosts({ filter })
  const { authFetch } = useAuthFetch()

  const handleStatusChange = async (postId: string, newStatus: 'draft' | 'published'): Promise<boolean> => {
    try {
      const res = await authFetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      return data.success
      // 실시간 구독이므로 로컬 상태 업데이트 불필요 - Firestore가 자동 반영
    } catch {
      return false
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">블로그 글 목록</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">블로그 콘텐츠를 관리하고 편집합니다</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'draft', 'published'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {status === 'all' ? '전체' : status === 'draft' ? '초안' : '발행됨'}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 dark:text-gray-500" />
          <span className="ml-2 text-gray-500 dark:text-gray-400">로딩 중...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500 dark:text-red-400">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
          <FileX className="w-12 h-12 mb-3" />
          <p>등록된 글이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <PostCard post={post} onStatusChange={handleStatusChange} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <AuthGuard>
      <PostList />
    </AuthGuard>
  )
}
