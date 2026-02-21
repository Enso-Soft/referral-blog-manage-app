'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import JSZip from 'jszip'
import { PostViewer } from '@/components/post/PostViewer'
import { CopyButton, RichCopyButton } from '@/components/post/CopyButton'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { Snackbar } from '@/components/common/Snackbar'
import { AIChatContent } from '@/components/ai/AIChatModal'
import { DisclaimerButtons } from '@/components/post/DisclaimerButtons'
import { SeoAnalysisView } from '@/components/seo/SeoAnalysisView'
import { ThreadsSection } from '@/components/threads/ThreadsSection'
import { FloatingActionMenu, type PanelType } from '@/components/common/FloatingActionMenu'
import { SlidePanel } from '@/components/common/SlidePanel'
import { WordPressPanel } from '@/components/wordpress/WordPressPanel'
import { PublishedBadge } from '@/components/post/PublishedBadge'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { usePost } from '@/hooks/usePost'
import { usePosts } from '@/hooks/usePosts'
import { formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { isValidUrl, getFaviconUrl, extractImagesFromContent } from '@/lib/url-utils'
import { normalizeWordPressData } from '@/lib/wordpress-api'
import type { SeoAnalysis, ThreadsContent } from '@/lib/schemas'
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
  Download,
  ImageIcon,
  Send,
  User,
  Link2,
  RotateCcw,
  BarChart3,
  AtSign,
  Sparkles,
  Globe,
} from 'lucide-react'

function PostDetail() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const postId = params.id as string
  const { post, loading, error } = usePost(postId)
  const [productsOpen, setProductsOpen] = useState(false)
  const [imagesOpen, setImagesOpen] = useState(false)
  const [zipping, setZipping] = useState(false)
  const [statusChanging, setStatusChanging] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarVisible, setSnackbarVisible] = useState(false)
  const [manualUrls, setManualUrls] = useState<string[]>([])
  const [editingUrlIndex, setEditingUrlIndex] = useState<number | null>(null)
  const [editingUrlValue, setEditingUrlValue] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)
  const [newUrlValue, setNewUrlValue] = useState('')
  const [urlError, setUrlError] = useState('')
  const [urlSaving, setUrlSaving] = useState(false)
  const newUrlInputRef = useRef<HTMLInputElement>(null)
  const editUrlInputRef = useRef<HTMLInputElement>(null)
  const [activePanel, setActivePanel] = useState<PanelType | null>(null)
  const [activeTab, setActiveTab] = useState<'content' | 'seo'>('content')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { authFetch } = useAuthFetch()
  const { removePost, hasMore, loadMore } = usePosts()

  // 패널 열림 시 wrapper padding-right로 중앙 정렬 유지하며 공간 확보 (PC만)
  useEffect(() => {
    const wrapper = document.querySelector('main')?.parentElement
    if (!wrapper) return

    const mq = window.matchMedia('(min-width: 768px)')

    const apply = () => {
      if (activePanel && mq.matches) {
        wrapper.style.paddingRight = '420px'
      } else {
        wrapper.style.paddingRight = ''
      }
    }

    apply()
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      wrapper.style.paddingRight = ''
    }
  }, [activePanel])

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

  // 발행 URL 동기화 (Firestore 실시간 반영)
  const postPublishedUrls = (post as unknown as { publishedUrls?: string[] })?.publishedUrls
  useEffect(() => {
    if (postPublishedUrls?.length) {
      setManualUrls(postPublishedUrls)
    } else if (post?.publishedUrl) {
      setManualUrls([post.publishedUrl])
    } else {
      setManualUrls([])
    }
  }, [postPublishedUrls, post?.publishedUrl])

  // WP 싱크 확인: 진입 시 WP 글이 삭제되었으면 Firestore 자동 정리
  const wpSyncChecked = useRef(false)
  useEffect(() => {
    if (wpSyncChecked.current || !post) return
    const normalized = normalizeWordPressData((post as unknown as { wordpress?: Record<string, unknown> })?.wordpress)
    const hasPublishedSite = Object.values(normalized.sites)
      .some(d => d.wpPostId && (d.postStatus === 'published' || d.postStatus === 'scheduled'))
    if (!hasPublishedSite) return
    wpSyncChecked.current = true

    authFetch(`/api/wordpress/publish?postId=${postId}&sync=true`)
      .then(res => res.json())
      .catch(() => {})
    // onSnapshot이 Firestore 변경을 자동 반영하므로 응답 처리 불필요
  }, [post, postId, authFetch])

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

  const saveManualUrls = useCallback(async (urls: string[]) => {
    if (!post?.id) return false
    setUrlError('')
    setUrlSaving(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishedUrls: urls }),
      })
      const data = await res.json()
      if (data.success) {
        setSnackbarMessage('발행 주소 저장됨')
        setSnackbarVisible(true)
        setTimeout(() => setSnackbarVisible(false), 1500)
        return true
      } else {
        setUrlError('저장에 실패했습니다')
        return false
      }
    } catch (err) {
      setUrlError('저장에 실패했습니다')
      console.error(err)
      return false
    } finally {
      setUrlSaving(false)
    }
  }, [post?.id, authFetch])

  const handleAddUrl = useCallback(async () => {
    const trimmed = newUrlValue.trim()
    if (!trimmed) {
      setAddingUrl(false)
      setNewUrlValue('')
      return
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('올바른 URL을 입력해주세요')
      return
    }
    if (isDuplicateUrl(trimmed)) {
      setUrlError('이미 등록된 주소입니다')
      return
    }
    const updated = [...manualUrls, trimmed]
    const ok = await saveManualUrls(updated)
    if (ok) {
      setManualUrls(updated)
      setAddingUrl(false)
      setNewUrlValue('')
    }
  }, [newUrlValue, manualUrls, saveManualUrls])

  const handleRemoveUrl = useCallback(async (index: number) => {
    const updated = manualUrls.filter((_, i) => i !== index)
    const ok = await saveManualUrls(updated)
    if (ok) {
      setManualUrls(updated)
    }
  }, [manualUrls, saveManualUrls])

  const handleEditUrlSave = useCallback(async () => {
    if (editingUrlIndex === null) return
    const trimmed = editingUrlValue.trim()
    if (!trimmed) {
      // 빈 값 → 삭제로 처리
      await handleRemoveUrl(editingUrlIndex)
      setEditingUrlIndex(null)
      setEditingUrlValue('')
      return
    }
    if (!isValidUrl(trimmed)) {
      setUrlError('올바른 URL을 입력해주세요')
      return
    }
    if (isDuplicateUrl(trimmed, editingUrlIndex)) {
      setUrlError('이미 등록된 주소입니다')
      return
    }
    const updated = [...manualUrls]
    updated[editingUrlIndex] = trimmed
    const ok = await saveManualUrls(updated)
    if (ok) {
      setManualUrls(updated)
      setEditingUrlIndex(null)
      setEditingUrlValue('')
    }
  }, [editingUrlIndex, editingUrlValue, manualUrls, saveManualUrls, handleRemoveUrl])

  // WP published sites
  const wpPublishedSites = useMemo(() => {
    if (!post) return []
    const normalized = normalizeWordPressData((post as unknown as { wordpress?: Record<string, unknown> })?.wordpress)
    return Object.entries(normalized.sites)
      .filter(([, data]) => data.wpPostId && data.wpPostUrl && data.postStatus !== 'not_published' && data.postStatus !== 'failed')
      .map(([siteId, data]) => ({
        siteId,
        url: data.wpPostUrl!,
        siteUrl: data.wpSiteUrl,
        status: data.postStatus,
      }))
  }, [post])

  // WP URL set for dedup with manual input
  const wpUrlSet = useMemo(() => new Set(wpPublishedSites.map(s => s.url)), [wpPublishedSites])

  // 중복 URL 검사 (ref로 최신 값 참조 → 선언 순서 무관)
  const manualUrlsRef = useRef(manualUrls)
  manualUrlsRef.current = manualUrls
  const wpUrlSetRef = useRef(wpUrlSet)
  wpUrlSetRef.current = wpUrlSet
  const isDuplicateUrl = useCallback((url: string, excludeIndex?: number) => {
    const existing = manualUrlsRef.current.filter((_, i) => i !== excludeIndex).map(u => u.trim())
    return existing.includes(url) || wpUrlSetRef.current.has(url)
  }, [])

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

  // 전체 이미지 ZIP 다운로드
  const handleDownloadAll = useCallback(async () => {
    if (images.length === 0 || !post?.title) return
    setZipping(true)
    try {
      const zip = new JSZip()
      const results = await Promise.allSettled(
        images.map(async (url, i) => {
          const res = await fetch(`/api/public/download?url=${encodeURIComponent(url)}`)
          if (!res.ok) throw new Error(`Failed: ${url}`)
          const blob = await res.blob()
          const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
          const name = `image_${i + 1}.${ext}`
          zip.file(name, blob)
        })
      )
      const failed = results.filter(r => r.status === 'rejected').length
      if (failed > 0) {
        setSnackbarMessage(`${failed}개 이미지 다운로드 실패`)
        setSnackbarVisible(true)
        setTimeout(() => setSnackbarVisible(false), 2000)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      const safeTitle = post.title.replace(/[<>:"/\\|?*]/g, '').trim()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(content)
      a.download = `${safeTitle}.zip`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (err) {
      console.error(err)
      setSnackbarMessage('ZIP 다운로드에 실패했습니다')
      setSnackbarVisible(true)
      setTimeout(() => setSnackbarVisible(false), 2000)
    } finally {
      setZipping(false)
    }
  }, [images, post?.title])

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

  const handleDeleteConfirm = useCallback(async () => {
    if (!post?.id) return

    setShowDeleteDialog(false)
    setIsDeleting(true)
    try {
      const res = await authFetch(`/api/posts/${post.id}`, { method: 'DELETE' })
      const data = await res.json()

      if (data.success) {
        removePost(post.id)
        if (hasMore) loadMore()
        router.push('/', { scroll: false })
      } else {
        setIsDeleting(false)
        setSnackbarMessage('삭제에 실패했습니다: ' + (data.error || ''))
        setSnackbarVisible(true)
        setTimeout(() => setSnackbarVisible(false), 2000)
      }
    } catch (err) {
      setIsDeleting(false)
      setSnackbarMessage('삭제에 실패했습니다.')
      setSnackbarVisible(true)
      setTimeout(() => setSnackbarVisible(false), 2000)
      console.error(err)
    }
  }, [post?.id, authFetch, router, removePost])

  if (isDeleting) {
    return (
      <div className="flex items-center justify-center py-12 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        <span className="text-muted-foreground">삭제 중...</span>
      </div>
    )
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
          scroll={false}
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
        <button
          onClick={() => router.push('/', { scroll: false })}
          className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          목록으로
        </button>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex-1 min-w-[280px]">
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
                  <Badge className={post.postType === 'affiliate'
                      ? 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-600'
                      : 'bg-slate-600 text-white border-slate-700 hover:bg-slate-600'
                    }>
                    {post.postType === 'affiliate' ? '제휴' : '일반'}
                  </Badge>

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleTypeChange}
                    disabled={statusChanging}
                    className={`rounded-lg ${post.postType === 'affiliate'
                        ? 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent'
                        : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/40 border-transparent'
                      }`}
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
                  </Button>
                </div>

                <div className="w-px h-4 bg-border hidden sm:block" />

                {/* Status Badge & Toggle */}
                <div className="flex items-center gap-2">
                  {post.status === 'published' ? (
                    <PublishedBadge
                      wordpress={(post as unknown as { wordpress?: Record<string, unknown> }).wordpress}
                      publishedUrls={manualUrls}
                      publishedUrl={post.publishedUrl}
                      className="px-2.5 py-1 text-xs font-semibold rounded-full border bg-green-600 text-white border-green-700"
                    />
                  ) : (
                    <Badge className="bg-amber-500 text-white border-amber-600 hover:bg-amber-500">
                      초안
                    </Badge>
                  )}

                  <Button
                    variant="outline"
                    size="xs"
                    onClick={handleStatusChange}
                    disabled={statusChanging}
                    className={`rounded-lg border-transparent ${post.status === 'draft'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
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
                  </Button>
                </div>
              </div>

              <div className="w-px h-3 bg-border hidden sm:block" />

              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{formatDate(post.createdAt, { includeTime: true })}</span>
              </div>

              {post.metadata?.wordCount != null && (
                <>
                  <div className="w-px h-3 bg-border hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    <span>{post.metadata.wordCount.toLocaleString()}자</span>
                  </div>
                </>
              )}

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
          <div className="flex flex-col gap-2 w-full md:w-auto items-end md:shrink-0">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <CopyButton content={post.content} />
              <RichCopyButton content={post.content} />
              <Link
                href={`/posts/${post.id}/edit`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap bg-background border border-border dark:border-gray-600 hover:bg-secondary/50 rounded-xl transition-colors shadow-sm"
              >
                <Edit className="w-4 h-4" />
                수정
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive border-destructive/20 dark:border-red-800 hover:bg-destructive/10 hover:text-destructive rounded-xl shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                삭제
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <DisclaimerButtons content={post.content} onInsert={handleDisclaimerInsert} />
            </div>
          </div>
        </div>

        {/* Keywords */}
        {post.keywords && post.keywords.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            {post.keywords.map((keyword, i) => (
              <Button
                key={i}
                variant="ghost"
                size="xs"
                onClick={() => handleKeywordCopy(keyword)}
                className="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50"
              >
                #{keyword}
              </Button>
            ))}
          </div>
        )}

        {/* Published URLs */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">발행 주소</span>
            {(wpPublishedSites.length > 0 || manualUrls.filter(u => !wpUrlSet.has(u)).length > 0) && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {wpPublishedSites.length + manualUrls.filter(u => !wpUrlSet.has(u)).length}개 사이트
              </span>
            )}
          </div>

          {/* WP Published Sites */}
          {wpPublishedSites.length > 0 && (
            <div className="space-y-2 mb-2">
              {wpPublishedSites.map(({ siteId, url, siteUrl, status }) => {
                let domain = ''
                try { domain = new URL(url).hostname } catch { /* */ }
                const isScheduled = status === 'scheduled'
                return (
                  <div key={siteId} className="flex items-center gap-2 group">
                    <div className="flex-1 flex items-center gap-2 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                      {getFaviconUrl(url) && (
                        <img
                          src={getFaviconUrl(url)!}
                          alt=""
                          className="w-4 h-4 rounded-sm bg-white flex-shrink-0"
                          onError={(e) => { e.currentTarget.style.display = 'none' }}
                        />
                      )}
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {domain}
                      </span>
                      {isScheduled && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex-shrink-0">
                          예약
                        </span>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                        {url}
                      </span>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      열기
                    </a>
                  </div>
                )
              })}
            </div>
          )}

          {/* Manual URLs: read mode rows + add button */}
          {(() => {
            const filteredManualUrls = manualUrls.filter(url => !wpUrlSet.has(url))

            return (
              <>
                {filteredManualUrls.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {filteredManualUrls.map((url, displayIdx) => {
                      // 원본 배열에서의 실제 인덱스 찾기
                      const realIndex = manualUrls.indexOf(url)
                      const isEditing = editingUrlIndex === realIndex
                      const favicon = getFaviconUrl(url)

                      if (isEditing) {
                        return (
                          <div key={realIndex} className="flex items-center gap-2">
                            <Input
                              ref={editUrlInputRef}
                              type="url"
                              value={editingUrlValue}
                              onChange={(e) => {
                                const v = e.target.value
                                setEditingUrlValue(v)
                                const trimmed = v.trim()
                                if (trimmed && isValidUrl(trimmed) && isDuplicateUrl(trimmed, editingUrlIndex ?? undefined)) {
                                  setUrlError('이미 등록된 주소입니다')
                                } else {
                                  setUrlError('')
                                }
                              }}
                              onBlur={handleEditUrlSave}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); handleEditUrlSave() }
                                if (e.key === 'Escape') { setEditingUrlIndex(null); setEditingUrlValue(''); setUrlError('') }
                              }}
                              className={`flex-1 text-sm ${urlError ? 'border-red-500' : ''}`}
                              disabled={urlSaving}
                              autoFocus
                            />
                          </div>
                        )
                      }

                      return (
                        <div key={realIndex} className="flex items-center gap-2 group">
                          <div
                            onClick={() => {
                              setEditingUrlIndex(realIndex)
                              setEditingUrlValue(url)
                              setUrlError('')
                              setTimeout(() => editUrlInputRef.current?.focus(), 0)
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                          >
                            {favicon && (
                              <img
                                src={favicon}
                                alt=""
                                className="w-4 h-4 rounded-sm bg-white flex-shrink-0"
                                onError={(e) => { e.currentTarget.style.display = 'none' }}
                              />
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
                              {url}
                            </span>
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                          >
                            <ExternalLink className="w-4 h-4" />
                            열기
                          </a>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleRemoveUrl(realIndex)}
                            disabled={urlSaving}
                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex-shrink-0"
                            title="삭제"
                          >
                            ×
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Add URL */}
                {addingUrl || (filteredManualUrls.length === 0 && wpPublishedSites.length === 0) ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        ref={newUrlInputRef}
                        type="url"
                        value={newUrlValue}
                        onChange={(e) => {
                          const v = e.target.value
                          setNewUrlValue(v)
                          const trimmed = v.trim()
                          if (trimmed && isValidUrl(trimmed) && isDuplicateUrl(trimmed)) {
                            setUrlError('이미 등록된 주소입니다')
                          } else {
                            setUrlError('')
                          }
                        }}
                        onBlur={handleAddUrl}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') { e.preventDefault(); handleAddUrl() }
                          if (e.key === 'Escape') { setAddingUrl(false); setNewUrlValue(''); setUrlError('') }
                        }}
                        placeholder="https://example.com/blog/..."
                        className={`flex-1 text-sm ${urlError ? 'border-red-500' : ''}`}
                        disabled={urlSaving}
                      />
                    </div>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddingUrl(true)
                      setUrlError('')
                      setTimeout(() => newUrlInputRef.current?.focus(), 0)
                    }}
                    className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 border-dashed border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    + 주소 추가
                  </Button>
                )}

                {urlError && (
                  <p className="mt-1 text-sm text-red-500">{urlError}</p>
                )}
                {urlSaving && (
                  <p className="mt-1 text-sm text-gray-500 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    저장 중...
                  </p>
                )}
              </>
            )
          })()}
        </div>

        {/* Products */}
        {post.products && post.products.length > 0 && (
          <div className="mt-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Button
              variant="ghost"
              onClick={() => setProductsOpen(!productsOpen)}
              className="w-full flex items-center justify-start gap-2 p-4 h-auto rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${productsOpen ? 'rotate-180' : ''}`} />
              <ShoppingBag className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">제품 목록 ({post.products.length}개)</span>
            </Button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${productsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pt-4 pb-4 space-y-2">
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
            <div className="relative">
              <Button
                variant="ghost"
                onClick={() => setImagesOpen(!imagesOpen)}
                className="w-full flex items-center justify-start gap-2 p-4 h-auto rounded-none hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${imagesOpen ? 'rotate-180' : ''}`} />
                <ImageIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">이미지 목록 ({images.length}개)</span>
              </Button>
              <Button
                variant="default"
                size="xs"
                onClick={handleDownloadAll}
                disabled={zipping}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                {zipping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                {zipping ? '압축 중...' : '전체 다운로드'}
              </Button>
            </div>
            <div
              className={`grid transition-all duration-300 ease-in-out ${imagesOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
              <div className="overflow-hidden">
                <div className="px-4 pt-4 pb-4">
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                    {images.map((imageUrl, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100 dark:bg-gray-900">
                        <img
                          src={imageUrl}
                          alt={`이미지 ${i + 1}`}
                          className="w-full h-full object-cover"
                          style={{ height: '100%' }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
                              const safeTitle = (post?.title || 'image').replace(/[<>:"/\\|?*]/g, '').trim()
                              handleDownload(imageUrl, `${safeTitle}-${i + 1}.${ext}`)
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 hover:text-white"
                            title="다운로드"
                          >
                            <Download className="w-5 h-5" />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            const ext = imageUrl.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg'
                            const safeTitle = (post?.title || 'image').replace(/[<>:"/\\|?*]/g, '').trim()
                            handleDownload(imageUrl, `${safeTitle}-${i + 1}.${ext}`)
                          }}
                          className="absolute bottom-1 right-1 p-1.5 text-white/90 bg-black/50 rounded-md hover:bg-black/60 hover:text-white sm:hidden"
                          title="다운로드"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      {(() => {
        const hasSeo = !!(post as unknown as { seoAnalysis?: SeoAnalysis }).seoAnalysis
        const hasThreads = !!(post as unknown as { threads?: ThreadsContent }).threads
        const showTabs = hasSeo

        if (!showTabs) {
          return <PostViewer content={post.content} />
        }

        const tabs = [
          { id: 'content' as const, label: '콘텐츠', icon: FileText },
          ...(hasSeo ? [{ id: 'seo' as const, label: 'SEO 분석', icon: BarChart3 }] : []),
        ]

        return (
          <>
            <div className="flex items-center gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab) => {
                const Icon = tab.icon
                const isActive = activeTab === tab.id
                return (
                  <Button
                    key={tab.id}
                    variant="ghost"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative px-4 py-2.5 h-auto rounded-none ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Button>
                )
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'content' && <PostViewer content={post.content} />}
                {activeTab === 'seo' && hasSeo && (
                  <SeoAnalysisView
                    seoAnalysis={(post as unknown as { seoAnalysis: SeoAnalysis }).seoAnalysis}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )
      })()}

      {/* Floating Menu & Slide Panels */}
      {(() => {
        const hasThreads = !!(post as unknown as { threads?: ThreadsContent }).threads
        return (
          <>
            <FloatingActionMenu
              onOpenPanel={(panel) => setActivePanel(panel)}
              hasThreads={hasThreads}
            />

            <SlidePanel
              isOpen={activePanel === 'ai-chat'}
              onClose={() => setActivePanel(null)}
              title="AI 콘텐츠 수정"
              icon={<Sparkles className="w-4 h-4" />}
            >
              <AIChatContent postId={postId} isOpen={activePanel === 'ai-chat'} />
            </SlidePanel>

            <SlidePanel
              isOpen={activePanel === 'wordpress'}
              onClose={() => setActivePanel(null)}
              title="WordPress 발행"
              icon={<Globe className="w-4 h-4" />}
            >
              <WordPressPanel
                postId={postId}
                post={{
                  title: post.title,
                  content: post.content,
                  keywords: post.keywords,
                  updatedAt: post.updatedAt,
                  slug: (post as unknown as { slug?: string }).slug,
                  excerpt: (post as unknown as { excerpt?: string }).excerpt,
                  wordpress: (post as unknown as { wordpress?: Record<string, unknown> }).wordpress,
                }}
              />
            </SlidePanel>

            {hasThreads && (
              <SlidePanel
                isOpen={activePanel === 'threads'}
                onClose={() => setActivePanel(null)}
                title="Threads 발행"
                icon={<AtSign className="w-4 h-4" />}
              >
                <ThreadsSection
                  postId={postId}
                  threads={(post as unknown as { threads: ThreadsContent }).threads}
                />
              </SlidePanel>
            )}
          </>
        )
      })()}

      {/* Delete Confirm Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent showCloseButton={false} className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>글 삭제</DialogTitle>
            <DialogDescription>
              이 글을 삭제하시겠습니까? 삭제된 글은 복구할 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              <Trash2 className="w-4 h-4" />
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
