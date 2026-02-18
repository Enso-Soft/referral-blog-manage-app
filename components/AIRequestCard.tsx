'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  XCircle,
  CheckCircle,
  RotateCcw,
  X,
  Sparkles,
  MessageSquareText,
  ExternalLink,
  Clock,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/hooks/useAIWriteRequests'
import type { AIWriteRequest } from '@/lib/schemas/aiRequest'
import Link from 'next/link'

// Firestore Timestamp → Date 변환 유틸
function timestampToDate(ts: unknown): Date | null {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>
    if ('toDate' in obj && typeof obj.toDate === 'function')
      return (obj as { toDate: () => Date }).toDate()
    if (typeof obj._seconds === 'number')
      return new Date((obj._seconds as number) * 1000)
    if (typeof obj.seconds === 'number')
      return new Date((obj.seconds as number) * 1000)
  }
  return null
}

function formatTime(ts: unknown): string {
  const date = timestampToDate(ts)
  if (!date) return ''
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

interface AIRequestCardProps {
  request: AIWriteRequest
  onRetry: (request: AIWriteRequest) => void
  onDelete: (requestId: string) => Promise<void>
  onDismiss: (requestId: string) => Promise<void>
  onClick: (request: AIWriteRequest) => void
  onPendingClick?: () => void
}

export function AIRequestCard({
  request,
  onRetry,
  onDelete,
  onDismiss,
  onClick,
}: AIRequestCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)
  const [showDetail, setShowDetail] = useState(false)

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDeleting(true)
    try {
      await onDelete(request.id)
    } finally {
      setIsDeleting(false)
    }
  }, [onDelete, request.id])

  const handleDismiss = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDismissing(true)
    try {
      await onDismiss(request.id)
    } finally {
      setIsDismissing(false)
    }
  }, [onDismiss, request.id])

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onRetry(request)
  }, [onRetry, request])

  const isPending = request.status === 'pending'
  const isSuccess = request.status === 'success'
  const isFailed = request.status === 'failed'

  const handleClick = useCallback(() => {
    if (isPending || isSuccess) {
      setShowDetail(true)
    } else {
      onClick(request)
    }
  }, [isPending, isSuccess, onClick, request])

  const progressMessages = (request as unknown as { progressMessages?: Array<{ message: string; timestamp: unknown }> }).progressMessages

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        onClick={handleClick}
        className={cn(
          'relative cursor-pointer flex-shrink-0',
          'w-[280px] p-4 rounded-xl flex flex-col',
          'border',
          isPending && [
            'bg-violet-50 dark:bg-violet-950/30',
            'border-violet-200 dark:border-violet-800/50',
            'hover:border-violet-300 dark:hover:border-violet-700',
            'hover:shadow-lg hover:shadow-violet-500/10',
          ],
          isSuccess && [
            'bg-green-50 dark:bg-green-950/30',
            'border-green-200 dark:border-green-800/50',
            'hover:border-green-300 dark:hover:border-green-700',
            'hover:shadow-lg hover:shadow-green-500/10',
          ],
          isFailed && [
            'bg-red-50 dark:bg-red-950/20',
            'border-red-200 dark:border-red-800/40',
            'hover:border-red-300 dark:hover:border-red-700',
            'hover:shadow-lg hover:shadow-red-500/10',
          ]
        )}
      >
        {/* Header: Status + Delete */}
        <div className="flex items-center justify-between mb-3">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
              isPending && 'bg-violet-500 text-white',
              isSuccess && 'bg-green-500 text-white',
              isFailed && 'bg-red-500 text-white'
            )}
          >
            {isPending && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>진행중</span>
              </>
            )}
            {isSuccess && (
              <>
                <CheckCircle className="w-3 h-3" />
                <span>완료</span>
              </>
            )}
            {isFailed && (
              <>
                <XCircle className="w-3 h-3" />
                <span>실패</span>
              </>
            )}
          </div>

          {isSuccess && (
            <button
              onClick={handleDismiss}
              disabled={isDismissing}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300',
                'hover:bg-gray-200 dark:hover:bg-gray-700',
                isDismissing && 'opacity-50'
              )}
            >
              {isDismissing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          )}

          {isFailed && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                'text-gray-400 hover:text-red-500',
                'hover:bg-red-100 dark:hover:bg-red-900/30',
                isDeleting && 'opacity-50'
              )}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
            </button>
          )}

          {isPending && (
            <Sparkles className="w-4 h-4 text-violet-500 dark:text-violet-400 animate-pulse" />
          )}
        </div>

        {/* Prompt */}
        <p className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2 mb-3">
          {request.prompt}
        </p>

        {/* Progress Message */}
        <AnimatePresence mode="wait">
          {isPending && request.progressMessage && (
            <motion.div
              key={request.progressMessage}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-1.5 mb-3"
            >
              <MessageSquareText className="w-3 h-3 flex-shrink-0 text-violet-600 dark:text-violet-400" />
              <p className="text-xs text-violet-600 dark:text-violet-400 line-clamp-2">
                {request.progressMessage}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {isFailed && request.errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-3 line-clamp-2">
            {request.errorMessage}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatRelativeTime(request.createdAt)}
          </span>

          {isSuccess && request.resultPostId && (
            <Link
              href={`/posts/${request.resultPostId}`}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium transition-colors',
                'bg-green-500 hover:bg-green-600 text-white'
              )}
            >
              <ExternalLink className="w-3 h-3" />
              글 보기
            </Link>
          )}
          {isFailed && (
            <button
              onClick={handleRetry}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg',
                'text-xs font-medium transition-colors',
                'bg-violet-500 hover:bg-violet-600 text-white'
              )}
            >
              <RotateCcw className="w-3 h-3" />
              재시도
            </button>
          )}
        </div>
      </motion.div>

      {/* Progress Detail Modal — Portal + flex 센터링 (framer-motion transform 간섭 회피) */}
      <ProgressDetailModal
        show={showDetail}
        onClose={() => setShowDetail(false)}
        request={request}
        progressMessages={progressMessages}
      />
    </>
  )
}

// 이미지 갤러리 (썸네일 + 전체화면 뷰어)
function ImageGallery({ images }: { images: string[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  return (
    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-1.5 mb-2">
        <ImageIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          첨부 이미지 ({images.length})
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setViewerIndex(i)}
            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden
                       border border-gray-200 dark:border-gray-700
                       hover:border-violet-400 dark:hover:border-violet-500
                       hover:scale-105 active:scale-95 transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`첨부 이미지 ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      <ImageViewer
        images={images}
        currentIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onNavigate={setViewerIndex}
      />
    </div>
  )
}

// 전체화면 이미지 뷰어
function ImageViewer({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[]
  currentIndex: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [direction, setDirection] = useState(0)
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // 줌 상태 초기화 (이미지 전환 시)
  useEffect(() => { setZoomed(false) }, [currentIndex])

  // 키보드 네비게이션
  useEffect(() => {
    if (currentIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setDirection(-1)
        onNavigate(currentIndex - 1)
      }
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setDirection(1)
        onNavigate(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  const goTo = useCallback((index: number) => {
    if (currentIndex === null) return
    setDirection(index > currentIndex ? 1 : -1)
    onNavigate(index)
  }, [currentIndex, onNavigate])

  if (!mounted || currentIndex === null) return null

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  }

  return createPortal(
    <AnimatePresence>
      {currentIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black"
          onClick={onClose}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 z-10"
               onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-white/70 font-medium">
              {currentIndex + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoomed(z => !z)}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
              </button>
              <button
                onClick={onClose}
                className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
               onClick={(e) => e.stopPropagation()}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={!zoomed ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragStart={(_, info) => {
                  dragRef.current = { startX: info.point.x, startY: info.point.y }
                }}
                onDragEnd={(_, info) => {
                  const threshold = 50
                  if (info.offset.x < -threshold && currentIndex < images.length - 1) {
                    setDirection(1)
                    onNavigate(currentIndex + 1)
                  } else if (info.offset.x > threshold && currentIndex > 0) {
                    setDirection(-1)
                    onNavigate(currentIndex - 1)
                  }
                }}
                className="absolute inset-0 flex items-center justify-center p-4"
                onClick={() => setZoomed(z => !z)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img
                  src={images[currentIndex]}
                  alt={`이미지 ${currentIndex + 1}`}
                  animate={{ scale: zoomed ? 2 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={cn(
                    'max-w-full max-h-full object-contain rounded-lg select-none',
                    zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  )}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

            {/* Nav arrows */}
            {currentIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1) }}
                className="absolute left-3 p-2 rounded-full bg-black/40 text-white/80
                           hover:bg-black/60 hover:text-white backdrop-blur-sm transition-all
                           hover:scale-110 active:scale-95 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}
            {currentIndex < images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1) }}
                className="absolute right-3 p-2 rounded-full bg-black/40 text-white/80
                           hover:bg-black/60 hover:text-white backdrop-blur-sm transition-all
                           hover:scale-110 active:scale-95 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 px-4 py-3 z-10"
                 onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                    i === currentIndex
                      ? 'border-white scale-110 shadow-lg shadow-white/20'
                      : 'border-transparent opacity-50 hover:opacity-80 hover:border-white/30'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// 진행 상세 모달 (Portal + flex 센터링)
function ProgressDetailModal({
  show,
  onClose,
  request,
  progressMessages,
}: {
  show: boolean
  onClose: () => void
  request: AIWriteRequest
  progressMessages?: Array<{ message: string; timestamp: unknown }>
}) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  // Body scroll 막기
  useEffect(() => {
    if (!show) return
    const { body, documentElement } = document
    const prevBodyOverflow = body.style.overflow
    const prevHtmlOverflow = documentElement.style.overflow
    body.style.overflow = 'hidden'
    documentElement.style.overflow = 'hidden'
    return () => {
      body.style.overflow = prevBodyOverflow
      documentElement.style.overflow = prevHtmlOverflow
    }
  }, [show])

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            layout
            transition={{
              type: 'spring', stiffness: 400, damping: 30,
              layout: { type: 'spring', stiffness: 300, damping: 30 },
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-gray-900
                       rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700
                       overflow-hidden"
          >
            {/* Modal Header */}
            <div className={cn(
              "flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800",
              request.status === 'success'
                ? "bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-teal-500/10 dark:from-green-500/20 dark:via-emerald-500/20 dark:to-teal-500/20"
                : "bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20"
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  'p-1.5 rounded-lg bg-gradient-to-br',
                  request.status === 'success'
                    ? 'from-green-500 to-emerald-500'
                    : 'from-violet-500 to-fuchsia-500'
                )}>
                  {request.status === 'success'
                    ? <CheckCircle className="w-4 h-4 text-white" />
                    : <Sparkles className="w-4 h-4 text-white" />
                  }
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {request.status === 'success' ? 'AI 작성 완료' : 'AI 작성 진행 상황'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(request.createdAt)} 시작
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt */}
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">요청 프롬프트</p>
              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap
                            max-h-[15rem] overflow-y-auto overscroll-contain">
                {request.prompt}
              </p>
            </div>

            {/* Attached Images */}
            {request.images && request.images.length > 0 && (
              <ImageGallery images={request.images} />
            )}

            {/* Timeline */}
            <div className="px-5 py-4 max-h-[50vh] overflow-y-auto">
              {progressMessages && progressMessages.length > 0 ? (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-violet-200 dark:bg-violet-800" />

                  <div className="space-y-4">
                    {progressMessages.map((entry, i) => {
                      const isLatest = i === progressMessages.length - 1
                      return (
                        <motion.div
                          key={`${i}-${entry.message}`}
                          initial={{ opacity: 0, height: 0, y: -8 }}
                          animate={{ opacity: 1, height: 'auto', y: 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          className="flex gap-3 relative"
                        >
                          {/* Dot */}
                          <div className={cn(
                            'w-[15px] h-[15px] rounded-full border-2 flex-shrink-0 mt-0.5 z-10',
                            isLatest && request.status === 'success'
                              ? 'bg-green-500 border-green-500 shadow-md shadow-green-500/30'
                              : isLatest
                                ? 'bg-violet-500 border-violet-500 shadow-md shadow-violet-500/30'
                                : 'bg-white dark:bg-gray-900 border-violet-300 dark:border-violet-700'
                          )}>
                            {isLatest && request.status === 'pending' && (
                              <div className="w-full h-full rounded-full animate-ping bg-violet-400 opacity-40" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 pb-1">
                            <p className={cn(
                              'text-sm',
                              isLatest
                                ? 'font-medium text-gray-900 dark:text-white'
                                : 'text-gray-600 dark:text-gray-400'
                            )}>
                              {entry.message}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {formatTime(entry.timestamp)}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800
                            bg-gray-50 dark:bg-gray-800/50">
              {request.status === 'success' ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {request.completedAt ? formatRelativeTime(request.completedAt) + ' 완료' : '완료됨'}
                  </span>
                  {request.resultPostId && (
                    <Link
                      href={`/posts/${request.resultPostId}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                                 text-xs font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      글 보기
                    </Link>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  실시간 업데이트 중...
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// AI 요청 섹션 컴포넌트
export function AIRequestSection({
  requests,
  onRetry,
  onDelete,
  onDismiss,
  onClick,
}: {
  requests: AIWriteRequest[]
  onRetry: (request: AIWriteRequest) => void
  onDelete: (requestId: string) => Promise<void>
  onDismiss: (requestId: string) => Promise<void>
  onClick: (request: AIWriteRequest) => void
}) {
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const successCount = requests.filter(r => r.status === 'success').length
  const failedCount = requests.filter(r => r.status === 'failed').length

  return (
    <div className="mb-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/20">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            AI 글 작성 현황
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {pendingCount > 0 && `${pendingCount}개 진행중`}
            {pendingCount > 0 && successCount > 0 && ' · '}
            {successCount > 0 && `${successCount}개 완료`}
            {(pendingCount > 0 || successCount > 0) && failedCount > 0 && ' · '}
            {failedCount > 0 && `${failedCount}개 실패`}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {requests.map((request) => (
            <AIRequestCard
              key={request.id}
              request={request}
              onRetry={onRetry}
              onDelete={onDelete}
              onDismiss={onDismiss}
              onClick={onClick}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
