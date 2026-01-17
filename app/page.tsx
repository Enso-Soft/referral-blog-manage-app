'use client'

import { useState, useEffect } from 'react'
import { PostCard } from '@/components/PostCard'
import { Loader2, AlertCircle, FileX } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'

type StatusFilter = 'all' | 'draft' | 'published'

export default function HomePage() {
  const [filter, setFilter] = useState<StatusFilter>('all')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPosts() {
      setLoading(true)
      try {
        const url = filter === 'all' ? '/api/posts' : `/api/posts?status=${filter}`
        const res = await fetch(url)
        const data = await res.json()

        if (data.success) {
          setPosts(data.posts)
        } else {
          setError(data.error || '포스트를 불러올 수 없습니다')
        }
      } catch (err) {
        setError('포스트를 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [filter])

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">블로그 글 목록</h1>
        <p className="text-gray-500 mt-1">블로그 콘텐츠를 관리하고 편집합니다</p>
      </div>

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

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">로딩 중...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      ) : posts.length === 0 ? (
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
