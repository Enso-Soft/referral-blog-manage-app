'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { cn } from '@/lib/utils'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useAIWriteRequests, formatRelativeTime } from '@/hooks/useAIWriteRequests'
import {
  TONE_OPTIONS,
  LENGTH_OPTIONS,
  PLATFORM_OPTIONS,
  type AIWriteOptions,
  type AIWriteRequest,
} from '@/lib/schemas/aiRequest'
import { ProductSearchSheet } from './ProductSearchSheet'
import Link from 'next/link'

interface AIWriterModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SelectedProduct {
  id: string
  name: string
  affiliateLink: string
}

const MAX_IMAGES = 10
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB

export function AIWriterModal({ isOpen, onClose }: AIWriterModalProps) {
  // Form state
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [platform, setPlatform] = useState<'tistory' | 'naver' | 'both'>('tistory')
  const [toneType, setToneType] = useState<string>('friendly')
  const [customTone, setCustomTone] = useState('')
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])

  // UI state
  const [isOptionsExpanded, setIsOptionsExpanded] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isProductSheetOpen, setIsProductSheetOpen] = useState(false)

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const { authFetch } = useAuthFetch()
  const {
    requests,
    loading: requestsLoading,
    hasMore,
    loadMore,
    latestCompletedRequest,
    clearLatestCompleted,
  } = useAIWriteRequests()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // 알림음 초기화
  useEffect(() => {
    audioRef.current = new Audio('/sounds/notification.mp3')
    audioRef.current.volume = 0.5
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
      if (e.key === 'Escape' && isOpen && !isProductSheetOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, isProductSheetOpen])

  // Body scroll 막기
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: { file: File; preview: string }[] = []

    files.forEach(file => {
      if (images.length + validFiles.length >= MAX_IMAGES) return
      if (file.size > MAX_IMAGE_SIZE) {
        setSubmitError('이미지 크기는 5MB 이하여야 합니다')
        return
      }
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setSubmitError('jpg, jpeg, png, webp 형식만 지원합니다')
        return
      }
      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      })
    })

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
  const handleProductSelect = useCallback((product: { name: string; affiliateLink: string }) => {
    const id = `product-${Date.now()}`
    setSelectedProducts(prev => {
      if (prev.some(p => p.affiliateLink === product.affiliateLink)) {
        return prev
      }
      return [...prev, { id, ...product }]
    })
    setIsProductSheetOpen(false)
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
      const tone = toneType === 'custom' ? customTone : TONE_OPTIONS.find(t => t.value === toneType)?.label

      const formData = new FormData()
      formData.append('prompt', prompt.trim())
      formData.append('options', JSON.stringify({
        platform,
        tone,
        length,
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

      // 성공 시 폼 초기화
      setPrompt('')
      setImages([])
      setSelectedProducts([])
      setToneType('friendly')
      setCustomTone('')
      setLength('medium')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  // 재시도
  const handleRetry = async (request: AIWriteRequest) => {
    setPrompt(request.prompt)
    setPlatform(request.options.platform)
    if (request.options.tone) {
      const found = TONE_OPTIONS.find(t => t.label === request.options.tone)
      if (found) {
        setToneType(found.value)
      } else {
        setToneType('custom')
        setCustomTone(request.options.tone)
      }
    }
    if (request.options.length) {
      setLength(request.options.length)
    }
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

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 pointer-events-none"
          >
            <div
              className="relative w-full max-w-2xl max-h-[90vh] bg-white dark:bg-gray-900
                         rounded-2xl shadow-2xl overflow-hidden pointer-events-auto
                         border border-gray-200 dark:border-gray-800"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4
                              bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10
                              dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20
                              border-b border-gray-200 dark:border-gray-800 backdrop-blur-xl">
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
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                             hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div
                id="ai-writer-modal-content"
                className="overflow-y-auto max-h-[calc(90vh-80px)] p-6 space-y-6"
              >
                {/* 에러 메시지 */}
                <AnimatePresence>
                  {submitError && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                                 rounded-xl text-red-700 dark:text-red-300 text-sm"
                    >
                      {submitError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* 프롬프트 입력 */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="text-lg">📝</span>
                    프롬프트 입력
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="예: 올리브영 추천 화장품 10가지 소개 글 작성해줘"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl
                               bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                               placeholder:text-gray-400 dark:placeholder:text-gray-500
                               focus:ring-2 focus:ring-violet-500 focus:border-transparent
                               resize-none transition-all"
                  />
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
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100
                                     flex items-center justify-center transition-opacity"
                        >
                          <Trash2 className="w-5 h-5 text-white" />
                        </button>
                      </div>
                    ))}

                    {images.length < MAX_IMAGES && (
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                                   hover:border-violet-400 dark:hover:border-violet-500
                                   flex items-center justify-center transition-colors
                                   text-gray-400 hover:text-violet-500"
                      >
                        <ImagePlus className="w-6 h-6" />
                      </button>
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
                  <button
                    onClick={() => setIsOptionsExpanded(!isOptionsExpanded)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300
                               hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                  >
                    <Settings2 className="w-4 h-4" />
                    옵션 설정
                    {isOptionsExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isOptionsExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        {/* 플랫폼 */}
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">플랫폼</label>
                          <div className="flex gap-2">
                            {PLATFORM_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => setPlatform(opt.value)}
                                className={cn(
                                  'px-4 py-2 text-sm font-medium rounded-lg transition-all',
                                  platform === opt.value
                                    ? 'bg-violet-500 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                                )}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* 글 톤 */}
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">글 톤</label>
                          <select
                            value={toneType}
                            onChange={(e) => setToneType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          >
                            {TONE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {toneType === 'custom' && (
                            <input
                              type="text"
                              value={customTone}
                              onChange={(e) => setCustomTone(e.target.value)}
                              placeholder="원하는 톤을 입력하세요"
                              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                         focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                            />
                          )}
                        </div>

                        {/* 글 길이 */}
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">글 길이</label>
                          <select
                            value={length}
                            onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                                       focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                          >
                            {LENGTH_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 제품 연동 */}
                        <div className="space-y-2">
                          <label className="text-sm text-gray-600 dark:text-gray-400">제품 연동</label>
                          <div className="flex flex-wrap gap-2">
                            {selectedProducts.map((product) => (
                              <span
                                key={product.id}
                                className="inline-flex items-center gap-1 px-3 py-1 bg-violet-100 dark:bg-violet-900/30
                                           text-violet-700 dark:text-violet-300 text-sm rounded-full"
                              >
                                {product.name.length > 20 ? product.name.slice(0, 20) + '...' : product.name}
                                <button
                                  onClick={() => removeProduct(product.id)}
                                  className="ml-1 hover:text-violet-900 dark:hover:text-violet-100"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            ))}
                            <button
                              onClick={() => setIsProductSheetOpen(true)}
                              className="px-3 py-1 border border-dashed border-gray-300 dark:border-gray-600
                                         text-gray-500 dark:text-gray-400 text-sm rounded-full
                                         hover:border-violet-400 hover:text-violet-500 transition-colors"
                            >
                              + 제품 추가
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* 요청하기 버튼 */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !prompt.trim()}
                  className={cn(
                    'w-full py-4 rounded-xl font-semibold text-white transition-all',
                    'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500',
                    'hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg hover:shadow-xl hover:scale-[1.02]',
                    'flex items-center justify-center gap-2'
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      요청 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      요청하기
                    </>
                  )}
                </button>

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
                          />
                        ))}
                      </div>

                      {/* 페이지네이션 */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="text-sm text-gray-500">
                            {currentPage} / {totalPages}
                          </span>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages && !hasMore}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800
                                       disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Product Search Sheet */}
          <ProductSearchSheet
            isOpen={isProductSheetOpen}
            onClose={() => setIsProductSheetOpen(false)}
            onSelect={handleProductSelect}
          />
        </>
      )}
    </AnimatePresence>
  )
}

// 요청 이력 아이템 컴포넌트
function RequestHistoryItem({
  request,
  onRetry,
}: {
  request: AIWriteRequest
  onRetry: () => void
}) {
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
      <span className={cn('flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium', config.badge)}>
        {config.icon}
        {config.label}
      </span>

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
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-violet-600 dark:text-violet-400
                     hover:bg-violet-100 dark:hover:bg-violet-900/30 rounded-md transition-colors"
        >
          글 보기
          <ExternalLink className="w-3 h-3" />
        </Link>
      )}
      {request.status === 'failed' && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400
                     hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          재시도
        </button>
      )}
    </div>
  )
}
