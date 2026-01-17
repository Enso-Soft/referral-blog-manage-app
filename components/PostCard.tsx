'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, FileText, Tag, Send, FileEdit, Loader2 } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'

interface PostCardProps {
  post: BlogPost
  onStatusChange?: (postId: string, newStatus: 'draft' | 'published') => Promise<boolean>
}

export function PostCard({ post, onStatusChange }: PostCardProps) {
  const [status, setStatus] = useState(post.status)
  const [isChanging, setIsChanging] = useState(false)
  // content에서 첫 번째 이미지 추출
  const thumbnail = post.content?.match(/<img[^>]+src=["']([^"']+)["']/)?.[1]

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    // Firestore Timestamp 형식 처리 (_seconds 또는 toDate)
    let date: Date
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000)
    } else if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else {
      date = new Date(timestamp)
    }

    if (isNaN(date.getTime())) return ''

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onStatusChange || !post.id) return

    const newStatus = status === 'draft' ? 'published' : 'draft'
    setIsChanging(true)

    try {
      const success = await onStatusChange(post.id, newStatus)
      if (success) {
        setStatus(newStatus)
      }
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <Link href={`/posts/${post.id}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Thumbnail */}
        {thumbnail && (
          <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
            <img
              src={thumbnail}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div className="p-4">
          {/* Status Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                status === 'published'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              }`}
            >
              {status === 'published' ? '발행됨' : '초안'}
            </span>
            {onStatusChange && (
              <button
                onClick={handleStatusToggle}
                disabled={isChanging}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  status === 'draft'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                } disabled:opacity-50`}
              >
                {isChanging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : status === 'draft' ? (
                  <>
                    <Send className="w-3 h-3" />
                    발행
                  </>
                ) : (
                  <>
                    <FileEdit className="w-3 h-3" />
                    초안
                  </>
                )}
              </button>
            )}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
            {post.title}
          </h3>

          {/* Content Preview */}
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
            {post.content.replace(/<[^>]*>/g, '').slice(0, 100)}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
            <div className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>{post.metadata?.wordCount?.toLocaleString() || 0}자</span>
            </div>
          </div>

          {/* Keywords */}
          {post.keywords && post.keywords.length > 0 && (
            <div className="flex items-center gap-1 mt-3 flex-wrap">
              <Tag className="w-3 h-3 text-gray-400 dark:text-gray-500" />
              {post.keywords.slice(0, 3).map((keyword, i) => (
                <span
                  key={i}
                  className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded"
                >
                  #{keyword}
                </span>
              ))}
              {post.keywords.length > 3 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  +{post.keywords.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
