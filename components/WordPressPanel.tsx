'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Globe,
  ImageIcon,
  Settings,
  Check,
  Trash2,
  X,
  Tag,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Calendar,
  History,
  MessageCircle,
} from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { formatDate } from '@/lib/utils'
import type { WordPressContent, WPPublishHistoryEntry } from '@/lib/schemas'

function extractImagesFromHtml(content: string): string[] {
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/g
  const images: string[] = []
  let match
  while ((match = imgRegex.exec(content)) !== null) {
    images.push(match[1])
  }
  return images
}

function padTwo(n: number): string {
  return String(n).padStart(2, '0')
}

function getDefaultSchedule() {
  const d = new Date()
  d.setHours(d.getHours() + 1, 0, 0, 0)
  return {
    date: `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`,
    time: `${padTwo(d.getHours())}:00`,
  }
}

function getTodayDateStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${padTwo(d.getMonth() + 1)}-${padTwo(d.getDate())}`
}

function timestampToMs(ts: unknown): number {
  if (!ts) return 0
  if (ts instanceof Date) return ts.getTime()
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>
    if ('toDate' in obj && typeof obj.toDate === 'function') return (obj as { toDate: () => Date }).toDate().getTime()
    if (typeof obj._seconds === 'number') return obj._seconds * 1000
    if (typeof obj.seconds === 'number') return (obj.seconds as number) * 1000
  }
  return 0
}

interface WordPressPanelProps {
  postId: string
  post: {
    title: string
    content: string
    keywords?: string[]
    updatedAt?: unknown
    slug?: string
    excerpt?: string
    wordpress?: WordPressContent
  }
}

export function WordPressPanel({ postId, post }: WordPressPanelProps) {
  const router = useRouter()
  const { authFetch } = useAuthFetch()
  const [wpConnected, setWpConnected] = useState<boolean | null>(null)
  const [wpSiteUrl, setWpSiteUrl] = useState<string | null>(null)
  const [wpDisplayName, setWpDisplayName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [publishing, setPublishing] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [publishStatus, setPublishStatus] = useState<'draft' | 'publish' | 'future'>('publish')
  const [featuredImageUrl, setFeaturedImageUrl] = useState<string | null>(null)
  const [removeFeaturedFromContent, setRemoveFeaturedFromContent] = useState(true)
  const [categories, setCategories] = useState<{ id: number; name: string; parent: number }[]>([])
  const [selectedCategories, setSelectedCategories] = useState<number[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [error, setError] = useState('')
  const [showRepublishModal, setShowRepublishModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [forceShowForm, setForceShowForm] = useState(false)
  const [showOverwriteModal, setShowOverwriteModal] = useState(false)
  const [showNoCategoryModal, setShowNoCategoryModal] = useState(false)
  const [justPublished, setJustPublished] = useState<{ wpPostId: number; wpPostUrl: string; postStatus?: string } | null>(null)

  // 태그
  const [wpTags, setWpTags] = useState<{ id: number; name: string }[]>([])
  const [keywordTags, setKeywordTags] = useState<string[]>(post.keywords || [])
  const [newTagInput, setNewTagInput] = useState('')

  // 예약
  const [schedule, setSchedule] = useState(getDefaultSchedule)

  // SEO
  const [seoOpen, setSeoOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [excerpt, setExcerpt] = useState('')
  // 댓글 (localStorage 저장)
  const [commentStatus, setCommentStatus] = useState<'open' | 'closed'>(() => {
    if (typeof window === 'undefined') return 'open'
    return (localStorage.getItem('wp-comment-status') as 'open' | 'closed') || 'open'
  })
  // 빈 줄 제거 (localStorage 저장)
  const [removeEmptyParagraphs, setRemoveEmptyParagraphs] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('wp-remove-empty-paragraphs') === 'true'
  })

  // 댓글·빈줄 설정 변경 시 localStorage 저장
  const handleCommentStatusToggle = useCallback(() => {
    const next = commentStatus === 'open' ? 'closed' : 'open'
    setCommentStatus(next)
    localStorage.setItem('wp-comment-status', next)
  }, [commentStatus])

  const handleRemoveEmptyToggle = useCallback(() => {
    const next = !removeEmptyParagraphs
    setRemoveEmptyParagraphs(next)
    localStorage.setItem('wp-remove-empty-paragraphs', String(next))
  }, [removeEmptyParagraphs])

  // 이력
  const [historyOpen, setHistoryOpen] = useState(false)

  // 본문에서 이미지 추출
  const postImages = useMemo(() => extractImagesFromHtml(post.content || ''), [post.content])

  // 첫 번째 이미지를 기본 대표 이미지로
  useEffect(() => {
    if (postImages.length > 0 && !featuredImageUrl) {
      setFeaturedImageUrl(postImages[0])
    }
  }, [postImages, featuredImageUrl])

  // 게시물의 기존 WP 상태 반영
  const wpData = post.wordpress
  const isPublished = wpData?.postStatus === 'published'
  const isScheduled = wpData?.postStatus === 'scheduled'
  const isFailed = wpData?.postStatus === 'failed'

  // 업데이트 필요 감지
  const needsUpdate = useMemo(() => {
    if (!isPublished || !wpData?.lastSyncedAt || !post.updatedAt) return false
    return timestampToMs(post.updatedAt) > timestampToMs(wpData.lastSyncedAt)
  }, [isPublished, wpData?.lastSyncedAt, post.updatedAt])

  // 이전 발행 설정 복원 (우선순위: wordpress.* > post.* > '')
  useEffect(() => {
    setSlug(wpData?.slug || post.slug || '')
    setExcerpt(wpData?.excerpt || post.excerpt || '')
    // wpData.tags (WP tag IDs)는 더 이상 사용하지 않음 — keywordTags (문자열)로 통합
    if (wpData?.categories?.length) setSelectedCategories(wpData.categories)
    if (wpData?.commentStatus && !localStorage.getItem('wp-comment-status')) setCommentStatus(wpData.commentStatus)
  }, [wpData?.slug, wpData?.excerpt, post.slug, post.excerpt, wpData?.tags, wpData?.categories, wpData?.commentStatus])

  // WP 연결 상태 확인 + 카테고리/태그 로드
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await authFetch('/api/settings/wordpress')
        const data = await res.json()
        if (data.success && data.data) {
          setWpConnected(data.data.connected)
          setWpSiteUrl(data.data.siteUrl || null)
          setWpDisplayName(data.data.displayName || null)

          if (data.data.connected) {
            setCategoriesLoading(true)
            try {
              const [catRes, tagRes] = await Promise.allSettled([
                authFetch('/api/wordpress/categories'),
                authFetch('/api/wordpress/tags'),
              ])
              if (catRes.status === 'fulfilled') {
                const catData = await catRes.value.json()
                if (catData.success) setCategories(catData.data)
              }
              if (tagRes.status === 'fulfilled') {
                const tagData = await tagRes.value.json()
                if (tagData.success) setWpTags(tagData.data)
              }
            } catch { /* 실패 무시 */ }
            finally { setCategoriesLoading(false) }

            // WP 글 존재 확인
            if ((isPublished || isScheduled) && wpData?.wpPostId) {
              try {
                await authFetch(`/api/wordpress/publish?postId=${postId}&sync=true`)
              } catch { /* 싱크 실패 무시 */ }
            }
          }
        }
      } catch {
        setWpConnected(false)
      } finally {
        setLoading(false)
      }
    }
    checkConnection()
  }, [authFetch])

  // onSnapshot으로 발행 상태가 반영되면 justPublished 해제
  useEffect(() => {
    if ((isPublished || isScheduled) && justPublished) {
      setJustPublished(null)
    }
  }, [isPublished, isScheduled, justPublished])

  // 발행 완료 여부
  const publishedResult = forceShowForm
    ? null
    : (isPublished || isScheduled) && wpData?.wpPostId && wpData?.wpPostUrl
      ? { wpPostId: wpData.wpPostId, wpPostUrl: wpData.wpPostUrl, postStatus: wpData.postStatus }
      : justPublished

  // 키워드 태그 → WP 태그 ID로 변환 (없으면 생성)
  const resolveKeywordTags = useCallback(async (keywords: string[]): Promise<number[]> => {
    if (!keywords.length) return []
    const resolvedIds: number[] = []

    for (const keyword of keywords) {
      const existing = wpTags.find(
        (t) => t.name.toLowerCase() === keyword.toLowerCase()
      )
      if (existing) {
        resolvedIds.push(existing.id)
        continue
      }
      try {
        const res = await authFetch('/api/wordpress/tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: keyword }),
        })
        const data = await res.json()
        if (data.success && data.data?.id) {
          resolvedIds.push(data.data.id)
          setWpTags((prev) => [...prev, { id: data.data.id, name: data.data.name }])
        }
      } catch {
        // 생성 실패 시 무시
      }
    }
    return resolvedIds
  }, [wpTags, authFetch])

  const doPublish = useCallback(async () => {
    // 예약 발행 시 과거 시간 검증
    if (publishStatus === 'future') {
      const scheduled = new Date(`${schedule.date}T${schedule.time}`)
      if (isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
        setError('예약 시간이 현재 시간보다 이후여야 합니다.')
        return
      }
    }

    setPublishing(true)
    setError('')
    try {
      // 키워드 태그 → WP 태그 ID로 변환
      const tagIds = await resolveKeywordTags(keywordTags)

      const body: Record<string, unknown> = {
        postId,
        status: publishStatus,
        featuredImageUrl: featuredImageUrl || undefined,
        removeFeaturedFromContent,
        removeEmptyParagraphs,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        commentStatus,
      }

      if (publishStatus === 'future') {
        body.date = new Date(`${schedule.date}T${schedule.time}`).toISOString()
      }

      const res = await authFetch('/api/wordpress/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setForceShowForm(false)
        setJustPublished({
          wpPostId: data.data.wpPostId,
          wpPostUrl: data.data.wpPostUrl,
          postStatus: data.data.postStatus,
        })
      } else {
        setError(data.error || '발행에 실패했습니다.')
      }
    } catch {
      setError('발행에 실패했습니다.')
    } finally {
      setPublishing(false)
    }
  }, [postId, publishStatus, featuredImageUrl, removeFeaturedFromContent, removeEmptyParagraphs, selectedCategories, keywordTags, resolveKeywordTags, slug, excerpt, commentStatus, schedule, authFetch])

  const proceedPublish = useCallback(async () => {
    const existingWpPostId = wpData?.wpPostId
    if (existingWpPostId) {
      try {
        const res = await authFetch(`/api/wordpress/publish?wpPostId=${existingWpPostId}`)
        const data = await res.json()
        if (data.success && data.data.exists) {
          setShowOverwriteModal(true)
          return
        }
      } catch { /* 확인 실패 시 진행 */ }
    }
    doPublish()
  }, [wpData?.wpPostId, authFetch, doPublish])

  const handlePublish = useCallback(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setShowNoCategoryModal(true)
      return
    }
    proceedPublish()
  }, [categories.length, selectedCategories.length, proceedPublish])

  const handleUpdate = useCallback(async () => {
    setUpdating(true)
    setError('')
    try {
      const tagIds = await resolveKeywordTags(keywordTags)

      const body: Record<string, unknown> = {
        postId,
        status: 'publish',
        featuredImageUrl: featuredImageUrl || undefined,
        removeFeaturedFromContent,
        removeEmptyParagraphs,
        categories: selectedCategories.length > 0 ? selectedCategories : undefined,
        tags: tagIds.length > 0 ? tagIds : undefined,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        commentStatus,
      }

      const res = await authFetch('/api/wordpress/publish', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error || '업데이트에 실패했습니다.')
      }
    } catch {
      setError('업데이트에 실패했습니다.')
    } finally {
      setUpdating(false)
    }
  }, [postId, featuredImageUrl, removeFeaturedFromContent, removeEmptyParagraphs, selectedCategories, keywordTags, resolveKeywordTags, slug, excerpt, commentStatus, authFetch])

  // 발행 이력 (역순)
  const publishHistory = useMemo(() => {
    const history = (wpData?.publishHistory || []) as WPPublishHistoryEntry[]
    return [...history].reverse()
  }, [wpData?.publishHistory])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  // WP 미연결
  if (!wpConnected) {
    return (
      <div className="p-6 space-y-4">
        <div className="text-center py-8">
          <Globe className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            WordPress가 연결되어 있지 않습니다.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
            설정 페이지에서 WordPress 사이트를 연결해주세요.
          </p>
          <button
            onClick={() => router.push('/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
          >
            <Settings className="w-4 h-4" />
            설정으로 이동
          </button>
        </div>
      </div>
    )
  }

  // 발행 완료 화면
  if (publishedResult) {
    const isScheduledResult = publishedResult.postStatus === 'scheduled'
    return (
      <div className="p-6 space-y-4">
        {/* 발행/예약 상태 배너 */}
        <div className={`p-4 rounded-lg border ${
          isScheduledResult
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {isScheduledResult ? (
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            )}
            <span className={`font-medium ${
              isScheduledResult
                ? 'text-blue-700 dark:text-blue-400'
                : 'text-green-700 dark:text-green-400'
            }`}>
              {isScheduledResult ? 'WordPress에 예약 발행되었습니다' : 'WordPress에 발행되었습니다'}
            </span>
          </div>
          <p className={`text-sm break-all ${
            isScheduledResult
              ? 'text-blue-600 dark:text-blue-500'
              : 'text-green-600 dark:text-green-500'
          }`}>
            {publishedResult.wpPostUrl}
          </p>
          {isScheduledResult && wpData?.scheduledAt && (
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">
              예약 일시: {formatDate(wpData.scheduledAt, { includeTime: true })}
            </p>
          )}
        </div>

        {/* 업데이트 필요 알림 */}
        {needsUpdate && !isScheduledResult && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
                글이 수정되어 WordPress 업데이트가 필요합니다
              </span>
            </div>
            <button
              onClick={handleUpdate}
              disabled={updating}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium
                         bg-amber-600 text-white rounded-lg hover:bg-amber-700
                         disabled:opacity-50 transition-colors"
            >
              {updating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  업데이트 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  WordPress에 수정 반영
                </>
              )}
            </button>
          </div>
        )}

        {/* 에러 표시 */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        <a
          href={publishedResult.wpPostUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 text-sm font-medium
                     bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          WordPress에서 보기
        </a>

        {/* 수정 반영 버튼 (업데이트 필요하지 않아도 수동으로 가능) */}
        {!needsUpdate && !isScheduledResult && (
          <button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                       border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                       rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
                       disabled:opacity-50"
          >
            {updating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                업데이트 중...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                WordPress에 수정 반영
              </>
            )}
          </button>
        )}

        <button
          onClick={() => setShowRepublishModal(true)}
          className="w-full px-4 py-2.5 text-sm font-medium
                     border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                     rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          다시 발행
        </button>

        {/* 발행 이력 */}
        {publishHistory.length > 0 && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  발행 이력 ({publishHistory.length})
                </span>
              </div>
              {historyOpen ? (
                <ChevronUp className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {historyOpen && (
              <div className="px-3 pb-3 space-y-2">
                {publishHistory.map((entry, i) => {
                  const actionLabels: Record<string, { label: string; color: string }> = {
                    published: { label: '발행', color: 'text-green-600 dark:text-green-400' },
                    updated: { label: '업데이트', color: 'text-blue-600 dark:text-blue-400' },
                    deleted: { label: '삭제', color: 'text-red-600 dark:text-red-400' },
                    scheduled: { label: '예약', color: 'text-purple-600 dark:text-purple-400' },
                  }
                  const info = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-600' }
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                      <span className={`text-xs font-medium ${info.color}`}>
                        {info.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(entry.timestamp, { includeTime: true })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* 다시 발행 모달 */}
        {showRepublishModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => !deleting && setShowRepublishModal(false)}
            />
            <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
              <button
                onClick={() => setShowRepublishModal(false)}
                disabled={deleting}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                다시 발행
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
                기존에 발행된 WordPress 글을 삭제하시겠습니까?
              </p>

              <div className="space-y-2">
                <button
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      const res = await authFetch('/api/wordpress/publish', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ postId }),
                      })
                      const data = await res.json()
                      if (!data.success) {
                        setError(data.error || '삭제에 실패했습니다.')
                      }
                    } catch {
                      setError('삭제에 실패했습니다.')
                    } finally {
                      setDeleting(false)
                      setShowRepublishModal(false)
                      setJustPublished(null)
                    }
                  }}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium
                             text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {deleting ? '삭제 중...' : '삭제하고 다시 발행'}
                </button>
                <button
                  onClick={() => {
                    setShowRepublishModal(false)
                    setForceShowForm(true)
                    setJustPublished(null)
                    setError('')
                  }}
                  disabled={deleting}
                  className="w-full px-4 py-2.5 text-sm font-medium
                             border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                             rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  삭제하지 않고 다시 발행
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // 발행 옵션 폼
  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 p-6 space-y-5">
      {/* 연결 정보 */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <Globe className="w-4 h-4 text-gray-500" />
        <div className="text-sm">
          <span className="text-gray-500 dark:text-gray-400">연결:</span>{' '}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {wpDisplayName || wpSiteUrl}
          </span>
        </div>
      </div>

      {/* 발행 실패 에러 */}
      {(isFailed || error) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">
              {error || wpData?.errorMessage || '발행에 실패했습니다.'}
            </p>
          </div>
        </div>
      )}

      {/* 발행 상태 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          발행 상태
        </label>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="publish"
              checked={publishStatus === 'publish'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">공개 발행</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="draft"
              checked={publishStatus === 'draft'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">임시 저장</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="wp-status"
              value="future"
              checked={publishStatus === 'future'}
              onChange={(e) => setPublishStatus(e.target.value as 'draft' | 'publish' | 'future')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">예약 발행</span>
          </label>
        </div>
      </div>

      {/* 예약 발행 날짜 */}
      {publishStatus === 'future' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            예약 일시
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={schedule.date}
              min={getTodayDateStr()}
              onChange={(e) => { setSchedule(s => ({ ...s, date: e.target.value })); setError('') }}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="time"
              value={schedule.time}
              onChange={(e) => { setSchedule(s => ({ ...s, time: e.target.value })); setError('') }}
              className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {schedule.date && schedule.time && new Date(`${schedule.date}T${schedule.time}`).getTime() <= Date.now() && (
            <p className="text-xs text-red-500 mt-1.5">현재 시간보다 이후의 시간을 선택해주세요.</p>
          )}
        </div>
      )}

      {/* 카테고리 선택 */}
      {categories.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            카테고리
          </label>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isSelected = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategories((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== cat.id)
                        : [...prev, cat.id]
                    )
                  }}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {cat.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {categoriesLoading && (
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="w-3 h-3 animate-spin" />
          카테고리/태그 불러오는 중...
        </div>
      )}

      {/* 대표 이미지 선택 */}
      {postImages.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ImageIcon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              대표 이미지
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {postImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setFeaturedImageUrl(url)}
                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  featuredImageUrl === url
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`이미지 ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {featuredImageUrl === url && (
                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-2 mt-3 cursor-pointer">
            <input
              type="checkbox"
              checked={removeFeaturedFromContent}
              onChange={(e) => setRemoveFeaturedFromContent(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              대표 이미지를 본문에서 제거
            </span>
          </label>
          <p className="ml-6 text-xs text-gray-400 dark:text-gray-500">
            해제 시 WordPress 테마 설정에 따라 대표 이미지가 본문에 중복으로 표시될 수 있습니다.
          </p>
        </div>
      )}

      {/* 태그 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          태그
        </label>
        {keywordTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {keywordTags.map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium
                           bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300
                           rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setKeywordTags((prev) => prev.filter((_, j) => j !== i))}
                  className="ml-0.5 hover:text-indigo-900 dark:hover:text-indigo-100 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTagInput.trim()) {
              e.preventDefault()
              const value = newTagInput.trim()
              if (!keywordTags.some((t) => t.toLowerCase() === value.toLowerCase())) {
                setKeywordTags((prev) => [...prev, value])
              }
              setNewTagInput('')
            }
          }}
          placeholder="태그 입력 후 Enter..."
          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                     rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                     focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-400 mt-1">발행 시 WordPress 태그로 자동 생성됩니다.</p>
      </div>

      {/* SEO 옵션 (접이식) */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setSeoOpen(!seoOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            SEO 옵션
          </span>
          {seoOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
        {seoOpen && (
          <div className="px-3 pb-3 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                슬러그 (URL)
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-post-slug"
                className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">비워두면 WordPress가 자동 생성합니다.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                요약 (Excerpt)
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="글 요약을 입력하세요..."
                rows={3}
                className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700
                           rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 댓글 설정 */}
      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">댓글 허용</span>
        </div>
        <button
          type="button"
          onClick={handleCommentStatusToggle}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            commentStatus === 'open'
              ? 'bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              commentStatus === 'open' ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 빈 줄(&nbsp;) 제거 */}
      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex-1 mr-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">빈 줄 제거</span>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            &lt;p&gt;&amp;nbsp;&lt;/p&gt; 형태의 공백 줄을 제거합니다
          </p>
        </div>
        <button
          type="button"
          onClick={handleRemoveEmptyToggle}
          className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${
            removeEmptyParagraphs
              ? 'bg-blue-600'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              removeEmptyParagraphs ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 발행 이력 (폼에서도 보기) */}
      {publishHistory.length > 0 && (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                발행 이력 ({publishHistory.length})
              </span>
            </div>
            {historyOpen ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
          {historyOpen && (
            <div className="px-3 pb-3 space-y-2">
              {publishHistory.map((entry, i) => {
                const actionLabels: Record<string, { label: string; color: string }> = {
                  published: { label: '발행', color: 'text-green-600 dark:text-green-400' },
                  updated: { label: '업데이트', color: 'text-blue-600 dark:text-blue-400' },
                  deleted: { label: '삭제', color: 'text-red-600 dark:text-red-400' },
                  scheduled: { label: '예약', color: 'text-purple-600 dark:text-purple-400' },
                }
                const info = actionLabels[entry.action] || { label: entry.action, color: 'text-gray-600' }
                return (
                  <div key={i} className="flex items-center justify-between py-1.5 border-t border-gray-100 dark:border-gray-700">
                    <span className={`text-xs font-medium ${info.color}`}>
                      {info.label}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(entry.timestamp, { includeTime: true })}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      </div>

      {/* 발행 버튼 — 하단 고정 */}
      <div className="sticky bottom-0 px-6 py-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm
                      border-t border-gray-100 dark:border-gray-800">
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium
                     bg-gradient-to-r from-blue-600 to-indigo-600 text-white
                     rounded-lg hover:from-blue-700 hover:to-indigo-700
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all shadow-md hover:shadow-lg"
        >
          {publishing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {publishStatus === 'future' ? '예약 중...' : '발행 중...'}
            </>
          ) : (
            <>
              {publishStatus === 'future' ? (
                <Clock className="w-4 h-4" />
              ) : (
                <Globe className="w-4 h-4" />
              )}
              {publishStatus === 'future' ? 'WordPress에 예약 발행' : 'WordPress에 발행'}
            </>
          )}
        </button>
        {publishing && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
            이미지 업로드 및 글 발행 중입니다. 잠시 기다려주세요...
          </p>
        )}
      </div>

      {/* 기존 글 덮어쓰기 확인 모달 */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowOverwriteModal(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={() => setShowOverwriteModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                기존 글이 존재합니다
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              WordPress에 이미 발행된 글이 있습니다. 새로 발행하면 발행 주소가 덮어씌워집니다.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowOverwriteModal(false)
                  doPublish()
                }}
                className="w-full px-4 py-2.5 text-sm font-medium
                           bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                새로 발행
              </button>
              <button
                onClick={() => setShowOverwriteModal(false)}
                className="w-full px-4 py-2.5 text-sm font-medium
                           border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 카테고리 미선택 확인 모달 */}
      {showNoCategoryModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowNoCategoryModal(false)}
          />
          <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-6">
            <button
              onClick={() => setShowNoCategoryModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                카테고리 미선택
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-5">
              카테고리를 선택하지 않았습니다. 그래도 발행하시겠습니까?
            </p>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setShowNoCategoryModal(false)
                  proceedPublish()
                }}
                className="w-full px-4 py-2.5 text-sm font-medium
                           bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                그래도 발행
              </button>
              <button
                onClick={() => setShowNoCategoryModal(false)}
                className="w-full px-4 py-2.5 text-sm font-medium
                           border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300
                           rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
