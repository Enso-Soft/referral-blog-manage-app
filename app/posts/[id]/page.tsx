'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { PostViewer } from '@/components/PostViewer'
import { CopyButton } from '@/components/CopyButton'
import { AuthGuard } from '@/components/AuthGuard'
import { Snackbar } from '@/components/Snackbar'
import { AIChatModal, AIChatFloatingButton } from '@/components/AIChatModal'
import { DisclaimerButtons } from '@/components/DisclaimerButtons'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePost } from '@/hooks/usePost'
import { formatDate } from '@/lib/utils'
import { isValidUrl, getFaviconUrl, extractImagesFromContent } from '@/lib/url-utils'
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
  User,
  Link2,
  RotateCcw,
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
  const [publishedUrl, setPublishedUrl] = useState('')
  const [publishedUrlError, setPublishedUrlError] = useState('')
  const [publishedUrlSaving, setPublishedUrlSaving] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
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

  // 발행 URL 초기값 동기화
  useEffect(() => {
    if (post?.publishedUrl) {
      setPublishedUrl(post.publishedUrl)
    }
  }, [post?.publishedUrl])

  const handleKeywordCopy = useCallback(async (keyword: string) => {
    await navigator.clipboard.writeText(keyword)
    setSnackbarMessage(`"${keyword}" 복사됨`)
    setSnackbarVisible(true)
    setTimeout(() => setSnackbarVisible(false), 1500)
  }, [])

  const handleTitleCopy = useCallback(async () => {
    if (!post?.title) return
    await navigator.clipboard.writeText(post.title)
    setSnackbarMessage('제목 복사됨')
    setSnackbarVisible(true)
    setTimeout(() => setSnackbarVisible(false), 1500)
  }, [post?.title])

  const handlePublishedUrlSave = useCallback(async () => {
    if (!post?.id) return

    // URL 검증
    if (!isValidUrl(publishedUrl)) {
      setPublishedUrlError('올바른 URL을 입력해주세요')
      return
    }

    setPublishedUrlError('')
    setPublishedUrlSaving(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedUrl: publishedUrl.trim() }),
      })
      const data = await res.json()

      if (data.success) {
        setSnackbarMessage('발행 주소 저장됨')
        setSnackbarVisible(true)
        setTimeout(() => setSnackbarVisible(false), 1500)
      } else {
        setPublishedUrlError('저장에 실패했습니다')
      }
    } catch (err) {
      setPublishedUrlError('저장에 실패했습니다')
      console.error(err)
    } finally {
      setPublishedUrlSaving(false)
    }
  }, [post?.id, publishedUrl, authFetch])

  // content에서 이미지 URL 추출 (useMemo로 캐싱)
  const images = useMemo(
    () => (post?.content ? extractImagesFromContent(post.content) : []),
    [post?.content]
  )

  // 이미지 다운로드 (서버 프록시 사용)
  const handleDownload = useCallback((imageUrl: string, customFileName?: string) => {
    let downloadUrl = `/api/public/download?url=${encodeURIComponent(imageUrl)}`
    if (customFileName) {
      downloadUrl += `&filename=${encodeURIComponent(customFileName)}`
    }
    window.location.href = downloadUrl
  }, [])

  // 썸네일 다운로드 핸들러
  const handleThumbnailDownload = useCallback(() => {
    if (images.length === 0 || !post?.title) return
    const thumbnailUrl = images[0]
    // URL에서 확장자 추출
    const urlPath = thumbnailUrl.split('?')[0]
    const extension = urlPath.split('.').pop()?.toLowerCase() || 'jpg'
    // 파일명에 사용할 수 없는 문자 제거
    const safeTitle = post.title.replace(/[<>:"/\\|?*]/g, '').trim()
    const fileName = `Thumbnail_${safeTitle}.${extension}`
    handleDownload(thumbnailUrl, fileName)
  }, [images, post?.title, handleDownload])

  // 타입 변경 핸들러 (useCallback으로 분리)
  const handleTypeChange = useCallback(async () => {
    if (!post?.id || statusChanging) return
    const newType = post.postType === 'affiliate' ? 'general' : 'affiliate'
    setStatusChanging(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postType: newType }),
      })
      if (!res.ok) {
        console.error('Failed to update type')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setStatusChanging(false)
    }
  }, [post?.id, post?.postType, statusChanging, authFetch])

  const handleStatusChange = useCallback(async () => {
    if (!post?.id || statusChanging) return
    const newStatus = post.status === 'draft' ? 'published' : 'draft'

    setStatusChanging(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()

      if (!data.success) {
        console.error('Failed to update status')
      }
    } catch (err) {
      console.error(err)
    } finally {
      setStatusChanging(false)
    }
  }, [post?.id, post?.status, statusChanging, authFetch])

  const handleDisclaimerInsert = useCallback(async (html: string) => {
    if (!post?.id) return
    const newContent = html + '\n' + (post.content || '')
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent }),
      })
      const data = await res.json()
      if (data.success) {
        setSnackbarMessage('대가성 문구가 추가되었습니다')
        setSnackbarVisible(true)
        setTimeout(() => setSnackbarVisible(false), 1500)
      } else {
        alert('문구 추가에 실패했습니다: ' + data.error)
      }
    } catch (err) {
      alert('문구 추가에 실패했습니다.')
      console.error(err)
    }
  }, [post?.id, post?.content, authFetch])

  const handleDelete = useCallback(async () => {
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
  }, [post?.id, authFetch, router])

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

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <h1
              onClick={handleTitleCopy}
              className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground break-words leading-tight mb-4 cursor-pointer hover:text-blue-600 transition-colors"
              title="클릭하여 제목 복사"
            >
              {post.title}
            </h1>

            {/* Meta Info & Status Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center gap-3">
                {/* Type Badge & Toggle */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${post.postType === 'affiliate'
                      ? 'bg-indigo-600 text-white border-indigo-700'
                      : 'bg-slate-600 text-white border-slate-700'
                    }`}>
                    {post.postType === 'affiliate' ? '제휴' : '일반'}
                  </span>

                  <button
                    onClick={handleTypeChange}
                    disabled={statusChanging}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${post.postType === 'affiliate'
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/40'
                      } ${statusChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {statusChanging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : post.postType === 'affiliate' ? (
                      <>
                        <Tag className="w-3.5 h-3.5" />
                        <span>일반 글로</span>
                      </>
                    ) : (
                      <>
                        <Tag className="w-3.5 h-3.5" />
                        <span>제휴 글로</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="w-px h-4 bg-border hidden sm:block" />

                {/* Status Badge & Toggle */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border flex items-center gap-1.5 ${post.status === 'published'
                      ? 'bg-green-600 text-white border-green-700'
                      : 'bg-amber-500 text-white border-amber-600'
                    }`}>
                    {post.status === 'published' && post.publishedUrl && getFaviconUrl(post.publishedUrl) && (
                      <img
                        src={getFaviconUrl(post.publishedUrl)!}
                        alt=""
                        className="w-3.5 h-3.5 rounded-sm bg-white"
                        onError={(e) => { e.currentTarget.style.display = 'none' }}
                      />
                    )}
                    {post.status === 'published' ? '발행됨' : '초안'}
                  </span>

                  <button
                    onClick={handleStatusChange}
                    disabled={statusChanging}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${post.status === 'draft'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                      } ${statusChanging ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {statusChanging ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : post.status === 'draft' ? (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>발행하기</span>
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>초안으로</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="w-px h-3 bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatDate(post.createdAt, { includeTime: true })}</span>
              </div>

              {post.userEmail && (
                <>
                  <div className="w-px h-3 bg-border hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>{post.userEmail.split('@')[0]}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <CopyButton content={post.content} />
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap bg-background border border-border hover:bg-secondary/50 rounded-xl transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" />
                수정
              </Link>
              <button
                onClick={handleDelete}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap text-destructive bg-background border border-destructive/20 hover:bg-destructive/10 rounded-xl transition-colors shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </button>
            </div>
            <div className="flex items-center gap-2">
              <DisclaimerButtons content={post.content} onInsert={handleDisclaimerInsert} />
            </div>
          </div>
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

        {/* Published URL */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">발행 주소</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={publishedUrl}
              onChange={(e) => {
                setPublishedUrl(e.target.value)
                setPublishedUrlError('')
              }}
              onBlur={handlePublishedUrlSave}
              placeholder="https://example.com/blog/..."
              className={`flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-blue-500 ${publishedUrlError ? 'border-red-500' : 'border-border'
                }`}
              disabled={publishedUrlSaving}
            />
            {publishedUrl.trim() && isValidUrl(publishedUrl) && (
              <a
                href={publishedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                열기
              </a>
            )}
          </div>
          {publishedUrlError && (
            <p className="mt-1 text-sm text-red-500">{publishedUrlError}</p>
          )}
          {publishedUrlSaving && (
            <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />
              저장 중...
            </p>
          )}
        </div>

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
              className={`grid transition-all duration-300 ease-in-out ${productsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
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
        {images.length > 0 && (
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
              className={`grid transition-all duration-300 ease-in-out ${imagesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 space-y-3">
                  {/* 썸네일 다운로드 버튼 */}
                  <button
                    onClick={handleThumbnailDownload}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    썸네일 다운로드
                  </button>
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
        )}
      </div>

      {/* Content */}
      <PostViewer content={post.content} />

      {/* AI Chat */}
      <AIChatFloatingButton onClick={() => setIsAIChatOpen(true)} />
      <AIChatModal
        postId={postId}
        isOpen={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
      />

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
