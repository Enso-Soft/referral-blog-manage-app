'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PostEditor } from '@/components/PostEditor'
import { ProductEditor } from '@/components/ProductEditor'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Product } from '@/lib/firestore'

interface Post {
  id: string
  title: string
  content: string
  products?: Product[]
  metadata?: {
    wordCount?: number
    originalPath?: string
  }
}

// 글자 수 계산
function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
  return text.length
}

function PostEditContent() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const { authFetch } = useAuthFetch()

  // 포스트 불러오기
  useEffect(() => {
    async function fetchPost() {
      try {
        const res = await authFetch(`/api/posts/${postId}`)
        const data = await res.json()

        if (data.success) {
          setPost(data.post)
          setProducts(data.post.products || [])
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
  }, [postId, authFetch])

  const handleSave = async (content: string) => {
    if (!post?.id) return

    setSaveStatus('saving')
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          products,
          metadata: {
            ...post.metadata,
            wordCount: countWords(content),
          },
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push(`/posts/${post.id}?saved=true`)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      console.error('Failed to save:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
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
        <p className="text-gray-500">{error || '글을 찾을 수 없습니다'}</p>
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
        <div className="flex items-center justify-between">
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft className="w-4 h-4" />
            상세보기로
          </Link>

          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <span
              className={`text-sm font-medium ${
                saveStatus === 'saving'
                  ? 'text-gray-500'
                  : saveStatus === 'saved'
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              {saveStatus === 'saving'
                ? '저장 중...'
                : saveStatus === 'saved'
                ? '저장됨!'
                : '저장 실패'}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mt-4">{post.title}</h1>
        <p className="text-gray-500 mt-1">콘텐츠를 수정합니다</p>
      </div>

      {/* Editor */}
      <PostEditor initialContent={post.content} onSave={handleSave} />

      {/* 제품 목록 에디터 */}
      <div className="mt-6">
        <ProductEditor products={products} onChange={setProducts} />
      </div>
    </div>
  )
}

export default function PostEditPage() {
  return (
    <AuthGuard>
      <PostEditContent />
    </AuthGuard>
  )
}
