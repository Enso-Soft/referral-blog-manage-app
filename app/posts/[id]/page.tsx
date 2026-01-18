'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { PostViewer } from '@/components/PostViewer'
import { CopyButton } from '@/components/CopyButton'
import { AuthGuard } from '@/components/AuthGuard'
import { Snackbar } from '@/components/Snackbar'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePost } from '@/hooks/usePost'
import {
  ArrowLeft,
  Edit,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  Tag,
  Trash2,
  ExternalLink,
  ShoppingBag,
  ChevronDown,
  ChevronUp,
  Download,
  ImageIcon,
  Send,
  FileEdit,
} from 'lucide-react'

function PostDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = params.id as string
  const { post, loading, error } = usePost(postId)
  const [productsOpen, setProductsOpen] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const { authFetch } = useAuthFetch()

  // 저장 완료 후 스낵바 표시
  useEffect(() => {
    if (searchParams.get('saved') === 'true') {
      setSnackbarMessage('저장 완료')
      setSnackbarVisible(true)
      setTimeout(() => setSnackbarVisible(false), 1500)
      // URL 정리 (쿼리 파라미터 제거)
      window.history.replaceState({}, '', `/posts/${postId}`)
    }
  }, [searchParams, postId])

  const handleKeywordCopy = async (keyword: string) => {
    await navigator.clipboard.writeText(keyword)
    setSnackbarMessage(`"${keyword}" 복사됨`)
    setSnackbarVisible(true)
    setTimeout(() => setSnackbarVisible(false), 1500)
  }

  // content에서 이미지 URL 추출
  const extractImages = (content: string): string[] => {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
    const images: string[] = []
    let match
    while ((match = imgRegex.exec(content)) !== null) {
      images.push(match[1])
    }
    return images
  }

  // 이미지 다운로드 (서버 프록시 사용)
  const handleDownload = (imageUrl: string) => {
    const downloadUrl = `/api/download?url=${encodeURIComponent(imageUrl)}`
    window.location.href = downloadUrl
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    // Firestore client SDK: toDate() 메서드 있음
    // API 응답: _seconds 필드 있음
    // 일반 Date 객체 또는 ISO string
    let date: Date
    if (timestamp.toDate) {
      date = timestamp.toDate()
    } else if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000)
    } else if (timestamp.seconds) {
      date = new Date(timestamp.seconds * 1000)
    } else {
      date = new Date(timestamp)
    }
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const handleStatusChange = async () => {
    if (!post?.id) return
    const newStatus = post.status === 'draft' ? 'published' : 'draft'
    const confirmMessage = newStatus === 'published'
      ? '이 글을 발행하시겠습니까?'
      : '이 글을 초안으로 변경하시겠습니까?'

    if (!window.confirm(confirmMessage)) return

    setStatusChanging(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (!data.success) {
        alert('상태 변경에 실패했습니다: ' + data.error)
      }
      // 성공 시 Firestore 실시간 구독으로 자동 반영됨
    } catch (err) {
      alert('상태 변경에 실패했습니다.')
      console.error(err)
    } finally {
      setStatusChanging(false)
    }
  }

  const handleDelete = async () => {
    if (!post?.id) return
    if (!window.confirm('정말로 이 글을 삭제하시겠습니까?')) return

    try {
      const res = await authFetch(`/api/posts/${post.id}`, { method: 'DELETE' })
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
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
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
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                }`}
              >
                {post.status === 'published' ? '발행됨' : '초안'}
              </span>
              <button
                onClick={handleStatusChange}
                disabled={statusChanging}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full transition-colors ${
                  post.status === 'draft'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                } disabled:opacity-50`}
              >
                {statusChanging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : post.status === 'draft' ? (
                  <>
                    <Send className="w-3 h-3" />
                    발행하기
                  </>
                ) : (
                  <>
                    <FileEdit className="w-3 h-3" />
                    초안으로
                  </>
                )}
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{post.title}</h1>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CopyButton content={post.content} />
            <Link
              href={`/posts/${post.id}/edit`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Edit className="w-4 h-4" />
              수정
            </Link>
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-4 h-4" />
              삭제
            </button>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-6 mt-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDate(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            <span>{post.metadata?.wordCount?.toLocaleString() || 0}자</span>
          </div>
          {post.userEmail && (
            <div className="text-gray-400 dark:text-gray-500">
              작성자: {post.userEmail}
            </div>
          )}
        </div>

        {/* Keywords */}
        {post.keywords && post.keywords.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            {post.keywords.map((keyword, i) => (
              <button
                key={i}
                onClick={() => handleKeywordCopy(keyword)}
                className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                #{keyword}
              </button>
            ))}
          </div>
        )}

        {/* Products */}
        {post.products && post.products.length > 0 && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <button
              onClick={() => setProductsOpen(!productsOpen)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">제품 목록 ({post.products.length}개)</span>
              </div>
              {productsOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              )}
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                productsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 space-y-2">
                  {post.products.map((product, i) => (
                    <div key={i} className="flex items-center justify-between bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                      <span className="text-sm text-gray-800 dark:text-gray-200">{product.name}</span>
                      <a
                        href={product.affiliateLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                      >
                        <ExternalLink className="w-3 h-3" />
                        링크
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Images */}
        {post.content && (() => {
          const images = extractImages(post.content)
          if (images.length === 0) return null
          return (
            <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <button
                onClick={() => setImagesOpen(!imagesOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">이미지 목록 ({images.length}개)</span>
                </div>
                {imagesOpen ? (
                  <ChevronUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
              <div
                className={`grid transition-all duration-300 ease-in-out ${
                  imagesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-3">
                    {images.map((imageUrl, i) => (
                      <div key={i} className="flex items-center gap-3 bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                        <img
                          src={imageUrl}
                          alt={`이미지 ${i + 1}`}
                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={imageUrl}
                          readOnly
                          className="flex-1 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 truncate"
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button
                          onClick={() => handleDownload(imageUrl)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-gray-700 dark:bg-gray-600 hover:bg-gray-800 dark:hover:bg-gray-500 rounded-lg flex-shrink-0"
                        >
                          <Download className="w-3 h-3" />
                          다운로드
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* Content */}
      <PostViewer content={post.content} />

      {/* Snackbar */}
      <Snackbar message={snackbarMessage} visible={snackbarVisible} />
    </div>
  )
}

export default function PostDetailPage() {
  return (
    <AuthGuard>
      <PostDetail />
    </AuthGuard>
  )
}
