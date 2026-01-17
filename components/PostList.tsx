'use client'

import { useState } from 'react'
import { usePosts } from '@/hooks/usePosts'
import { PostCard } from './PostCard'
import { Loader2, AlertCircle, FileX } from 'lucide-react'

type StatusFilter = 'all' | 'draft' | 'published'

export function PostList() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const { posts, loading, error } = usePosts(
    filter === 'all' ? undefined : filter
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <span>{error}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(['all', 'draft', 'published'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-gray-900 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            {status === 'all' ? '전체' : status === 'draft' ? '초안' : '발행됨'}
          </button>
        ))}
      </div>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <FileX className="w-12 h-12 mb-3" />
          <p>등록된 글이 없습니다</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
