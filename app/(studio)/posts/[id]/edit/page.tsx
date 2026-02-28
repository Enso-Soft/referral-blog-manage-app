'use client'

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { PostEditor } from '@/components/post/PostEditor'
import { ProductEditor } from '@/components/product/ProductEditor'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { countContentChars } from '@/lib/utils'
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Product } from '@/lib/firestore'

interface Post {
  id: string
  title: string
  content: string
  products?: Product[]
  postType?: 'general' | 'affiliate'
  metadata?: {
    wordCount?: number
    originalPath?: string
  }
}


function PostEditContent() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string
  const [post, setPost] = useState<Post | null>(null)
  const [title, setTitle] = useState('')
  const [postType, setPostType] = useState<'general' | 'affiliate'>('general')
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
          setTitle(data.post.title || '')
          setPostType(data.post.postType || 'general')
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
          title,
          content,
          postType,
          products,
          metadata: {
            ...post.metadata,
            wordCount: countContentChars(content),
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
            <span className="hidden md:inline">상세보기로</span>
          </Link>

          {/* Save Status */}
          {saveStatus !== 'idle' && (
            <span
              className={`text-sm font-medium ${saveStatus === 'saving'
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

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mt-4 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-blue-500 focus:outline-none transition-colors pb-1"
          placeholder="제목을 입력하세요"
        />

        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <button
              onClick={() => setPostType('general')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${postType === 'general'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              일반 글
            </button>
            <button
              onClick={() => setPostType('affiliate')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${postType === 'affiliate'
                ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
            >
              제휴/홍보
            </button>
          </div>
          <p className="hidden md:block text-sm text-gray-500">
            {postType === 'general' ? '일반적인 블로그 콘텐츠입니다.' : '제품 홍보 및 제휴 링크가 포함된 글입니다.'}
          </p>
        </div>
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
