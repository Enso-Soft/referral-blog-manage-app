'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  X,
  Sparkles,
  ImagePlus,
  Settings2,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react'
import { cn, resizeImageFile } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { formatRelativeTime } from '@/hooks/useAIWriteRequests'
import {
  type AIWriteOptions,
  type AIWriteRequest,
} from '@/lib/schemas/aiRequest'
import { ProductCombobox } from '@/components/product/ProductCombobox'
import Link from 'next/link'

interface AIWriterModalProps {
  isOpen: boolean
  onClose: () => void
  retryData?: AIWriteRequest | null
  // AI request data (부모에서 전달받아 이중 구독 방지)
  requests: AIWriteRequest[]
  requestsLoading: boolean
  hasMore: boolean
  loadMore: () => Promise<void>
  latestCompletedRequest: AIWriteRequest | null
  clearLatestCompleted: () => void
}

interface SelectedProduct {
  id: string
  name: string
  affiliateLink: string
}

const MAX_IMAGES = 10
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

const EXAMPLE_PROMPTS = [
  '올리브영 추천 화장품 10가지 소개',
  '초보자를 위한 홈트레이닝 루틴',
  '가성비 노트북 비교 리뷰',
  '서울 근교 당일치기 여행지 추천',
]

export function AIWriterModal({ isOpen, onClose, retryData, requests, requestsLoading, hasMore, loadMore, latestCompletedRequest, clearLatestCompleted }: AIWriterModalProps) {
  const [isMounted, setIsMounted] = useState(false)

  // Form state
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  // UI state
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const { authFetch } = useAuthFetch()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // textarea 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [prompt])

  // retryData가 변경되면 폼에 복원
  useEffect(() => {
    if (retryData && isOpen) {
      setPrompt(retryData.prompt)
      // 스크롤을 맨 위로
      setTimeout(() => {
        const modal = document.getElementById('ai-writer-modal-content')
        modal?.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
    }
  }, [retryData, isOpen])

  // 알림음 초기화
  useEffect(() => {
    const audio = new Audio('/sounds/notification.mp3')
    audio.volume = 0.5
    // 파일 존재 확인
    audio.addEventListener('canplaythrough', () => {
      audioRef.current = audio
    })
    audio.addEventListener('error', () => {
      // 알림음 파일이 없으면 무시
      audioRef.current = null
    })
  }, [])

  // 새로 완료된 요청 시 알림음
  useEffect(() => {
    if (latestCompletedRequest && isOpen) {
      audioRef.current?.play().catch(() => {
        // 자동 재생 차단 시 무시
      })
      clearLatestCompleted()
    }
  }, [latestCompletedRequest, isOpen, clearLatestCompleted])

  // ESC 키 핸들링
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Body scroll 막기
  useEffect(() => {
    if (!isOpen) return

    const { body, documentElement } = document
    const prevBodyOverflow = body.style.overflow
    const prevBodyPaddingRight = body.style.paddingRight
    const prevHtmlOverflow = documentElement.style.overflow
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth

    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = prevBodyOverflow
      body.style.paddingRight = prevBodyPaddingRight
      documentElement.style.overflow = prevHtmlOverflow
    }
  }, [isOpen])

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: { file: File; preview: string }[] = []

    for (const file of files) {
      if (images.length + validFiles.length >= MAX_IMAGES) break
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setSubmitError('jpg, jpeg, png, webp 형식만 지원합니다')
        continue
      }
      try {
        const resized = await resizeImageFile(file, 1920)
        validFiles.push({
          file: resized,
          preview: URL.createObjectURL(resized),
        })
      } catch {
        setSubmitError('이미지 처리 중 오류가 발생했습니다')
      }
    }

    setImages(prev => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [images.length])

  // 이미지 제거
  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // 제품 선택 핸들러
  const handleProductSelect = useCallback((product: { id: string; name: string; affiliateLink: string }) => {
    setSelectedProducts(prev => {
      if (prev.some(p => p.affiliateLink === product.affiliateLink)) {
        return prev
      }
      return [...prev, product]
    })
  }, [])

  // 제품 제거
  const removeProduct = useCallback((id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id))
  }, [])

  // 폼 제출
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      setSubmitError('프롬프트를 입력해주세요')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt.trim())
      formData.append('options', JSON.stringify({
        productIds: selectedProducts.map(p => p.affiliateLink),
      } as AIWriteOptions))

      images.forEach((img, i) => {
        formData.append(`image_${i}`, img.file)
      })

      const res = await authFetch('/api/ai/blog-writer', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || '요청에 실패했습니다')
      }

      // 성공 시 폼 초기화 후 모달 닫기
      setPrompt('')
      setImages([])
      setSelectedProducts([])
      onClose()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 삭제
  const handleDelete = async (requestId: string) => {
    try {
      const res = await authFetch(`/api/ai/blog-writer?id=${requestId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!data.success) {
        throw new Error(data.error || '삭제에 실패했습니다')
      }
    } catch (err) {
      console.error('Failed to delete request:', err)
      throw err
    }
  }

  // 재시도
  const handleRetry = async (request: AIWriteRequest) => {
    setPrompt(request.prompt)
    // 스크롤을 맨 위로
    const modal = document.getElementById('ai-writer-modal-content')
    modal?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 페이지네이션 계산
  const totalPages = Math.ceil(requests.length / itemsPerPage)
  const paginatedRequests = requests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // 더 불러오기 (다음 페이지로 갈 때)
  useEffect(() => {
    if (currentPage === totalPages && hasMore) {
      loadMore()
    }
  }, [currentPage, totalPages, hasMore, loadMore])

  if (!isMounted || !isOpen) return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full max-w-2xl max-h-full bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto border border-gray-200 dark:border-gray-800 flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20 border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      AI로 블로그 작성
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      프롬프트로 블로그 글을 자동 생성합니다
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Content */}
              <div
                id="ai-writer-modal-content"
                className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 [mask-image:linear-gradient(to_bottom,transparent,black_16px,black_calc(100%-16px),transparent)]"
              >
                {/* 에러 메시지 */}
                <AnimatePresence>
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
                    >
                      {submitError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 프롬프트 입력 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="text-lg">📝</span>
                    프롬프트 입력
                  </label>
                  <div className="relative">
                    <Textarea
                      ref={textareaRef}
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt.trim() && !isSubmitting) {
                          e.preventDefault()
                          handleSubmit()
                        }
                      }}
                      placeholder="어떤 블로그 글을 작성할까요?"
                      rows={3}
                      className="rounded-xl resize-none overflow-hidden"
                    />
                    {prompt.length > 0 && (
                      <div className="mt-1.5 px-1">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {prompt.length}자
                        </span>
                      </div>
                    )}
                  </div>
                  {/* 예시 프롬프트 칩 */}
                  {!prompt && (
                    <div className="flex flex-wrap gap-2">
                      {EXAMPLE_PROMPTS.map((example, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          onClick={() => setPrompt(example)}
                          className="h-auto px-3 py-1.5 text-xs rounded-lg bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/40"
                        >
                          {example}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 이미지 첨부 */}
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="text-lg">🖼️</span>
                    이미지 첨부
                    <span className="text-xs text-gray-400">
                      ({images.length}/{MAX_IMAGES})
                    </span>
                  </label>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    첨부한 이미지는 AI가 글에 직접 사용하거나, 참고하여 이미지를 생성하는 데 활용됩니다.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className="relative w-20 h-20 rounded-xl overflow-hidden group"
                      >
                        <img
                          src={img.preview}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 w-full h-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-none hover:bg-black/60"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </Button>
                      </div>
                    ))}

                    {images.length < MAX_IMAGES && (
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 flex items-center justify-center text-gray-400 hover:text-violet-500"
                      >
                        <ImagePlus className="w-6 h-6" />
                      </Button>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>

                {/* 옵션 설정 */}
                <div className="space-y-3">
                  <Button
                    variant="ghost"
                    onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
                    className="h-auto p-0 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-transparent gap-2"
                  >
                    <Settings2 className="w-4 h-4" />
                    옵션 설정
                    {isOptionsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </Button>

                  <AnimatePresence>
                    {isOptionsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        {/* 제품 연동 */}
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">제품 연동</label>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            쿠팡 파트너스/네이버 커넥트의 제휴 링크를 프롬프트에 직접 입력해도 AI가 자동으로 인식합니다.
                          </p>
                          <ProductCombobox
                            selectedProducts={selectedProducts}
                            onSelect={handleProductSelect}
                            onRemove={removeProduct}
                            maxSelections={10}
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 요청 이력 */}
                <div className="pt-6 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Clock className="w-4 h-4" />
                    요청 이력
                  </h3>

                  {requestsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  ) : requests.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                      아직 요청 이력이 없습니다
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {paginatedRequests.map((req) => (
                          <RequestHistoryItem
                            key={req.id}
                            request={req}
                            onRetry={() => handleRetry(req)}
                            onDelete={() => handleDelete(req.id)}
                          />
                        ))}
                      </div>

                      {/* 페이지네이션 */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <span className="text-sm text-gray-500">
                            {currentPage} / {totalPages}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages && !hasMore}
                            className="rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 요청하기 버튼 (하단 고정) */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !prompt.trim()}
                  className={cn(
                    'w-full h-auto py-4 rounded-xl font-semibold text-white',
                    'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500',
                    'hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600',
                    'shadow-lg hover:shadow-xl hover:scale-[1.02]',
                    'gap-2'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      AI 서버에 요청 전달 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      요청하기
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
    ,
    document.body
  )
}

// 요청 이력 아이템 컴포넌트
function RequestHistoryItem({
  request,
  onRetry,
  onDelete,
}: {
  request: AIWriteRequest
  onRetry: () => void
  onDelete: () => Promise<void>
}) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete()
    } finally {
      setIsDeleting(false)
    }
  }
  const statusConfig = {
    pending: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
      label: '진행중',
    },
    success: {
      icon: <CheckCircle className="w-4 h-4" />,
      badge: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
      label: '성공',
    },
    failed: {
      icon: <XCircle className="w-4 h-4" />,
      badge: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
      label: '실패',
    },
  }

  const config = statusConfig[request.status]

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
      {/* Status Badge */}
      <Badge variant="secondary" className={cn('rounded-md border-transparent', config.badge)}>
        {config.icon}
        {config.label}
      </Badge>

      {/* Prompt */}
      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
        {request.prompt.length > 30 ? request.prompt.slice(0, 30) + '...' : request.prompt}
      </span>

      {/* Time */}
      <span className="text-xs text-gray-400 whitespace-nowrap">
        {formatRelativeTime(request.createdAt)}
      </span>

      {/* Action */}
      {request.status === 'success' && request.resultPostId && (
        <Link
          href={`/posts/${request.resultPostId}`}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-md transition-colors"
        >
          글 보기
          <ExternalLink className="w-3 h-3" />
        </Link>
      )}
      {request.status === 'failed' && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            onClick={onRetry}
            className="h-auto px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            재시도
          </Button>
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-auto px-2 py-1 text-xs font-medium text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md gap-1"
          >
            {isDeleting ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Trash2 className="w-3 h-3" />
            )}
            삭제
          </Button>
        </div>
      )}
    </div>
  )
}
