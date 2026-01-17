'use client'

import Link from 'next/link'
import { Clock, FileText, Tag } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'

interface PostCardProps {
  post: BlogPost
}

export function PostCard({ post }: PostCardProps) {
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

  return (
    <Link href={`/posts/${post.id}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Thumbnail */}
        {post.thumbnail && (
          <div className="aspect-video bg-gray-100 relative">
            <img
              src={post.thumbnail}
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
                post.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {post.status === 'published' ? '발행됨' : '초안'}
            </span>
            <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
              {post.platform === 'both'
                ? '티스토리 + 네이버'
                : post.platform === 'tistory'
                ? '티스토리'
                : '네이버'}
            </span>
          </div>

          {/* Title */}
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
            {post.title}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">
            {post.excerpt}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-400">
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
              <Tag className="w-3 h-3 text-gray-400" />
              {post.keywords.slice(0, 3).map((keyword, i) => (
                <span
                  key={i}
                  className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
                >
                  #{keyword}
                </span>
              ))}
              {post.keywords.length > 3 && (
                <span className="text-xs text-gray-400">
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
