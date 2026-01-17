'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { PostViewer } from '@/components/PostViewer'
import { CopyButton } from '@/components/CopyButton'
import {
  ArrowLeft,
  Edit,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  Tag,
  Trash2,
} from 'lucide-react'

interface Post {
  id: string
  title: string
  content: string
  excerpt: string
  thumbnail: string
  keywords: string[]
  status: 'draft' | 'published'
  platform: 'tistory' | 'naver' | 'both'
  createdAt: any
  updatedAt: any
  metadata?: {
    originalPath?: string
    wordCount?: number
  }
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await fetch(`/api/posts/${postId}`)
        const data = await res.json()

        if (data.success) {
          setPost(data.post)
        } else {
          setError(data.error || '포스트를 불러올 수 없습니다')
        }
      } catch (err) {
        setError('포스트를 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchPost()
  }, [postId])

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    // Firestore Timestamp 형식 처리
    const date = timestamp._seconds
      ? new Date(timestamp._seconds * 1000)
      : new Date(timestamp)
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleDelete = async () => {
    if (!post?.id) return
    if (!window.confirm('정말로 이 글을 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        router.push('/')
      } else {
        alert('삭제에 실패했습니다: ' + data.error)
      }
    } catch (err) {
      alert('삭제에 실패했습니다.')
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <p className="text-gray-500">
          {error || '글을 찾을 수 없습니다'}
        </p>
        <Link
          href="/"
          className="mt-4 text-blue-600 hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로 돌아가기
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
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
            <h1 className="text-2xl font-bold text-gray-900">{post.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CopyButton content={post.content} />
            <Link
              href={`/posts/${post.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <Edit className="w-4 h-4" />
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDate(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{post.metadata?.wordCount?.toLocaleString() || 0}자</span>
          </div>
        </div>

        {/* Keywords */}
        {post.keywords && post.keywords.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {post.keywords.map((keyword, i) => (
              <span
                key={i}
                className="text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded"
              >
                #{keyword}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <PostViewer content={post.content} />
    </div>
  )
}
