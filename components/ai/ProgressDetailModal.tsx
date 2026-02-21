'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2,
  CheckCircle,
  Sparkles,
  ExternalLink,
  Clock,
  X,
} from 'lucide-react'
import { cn, toDate, formatRelativeTimeFns, format } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ImageGallery } from './ImageViewer'
import type { AIWriteRequest } from '@/lib/schemas/aiRequest'
import Link from 'next/link'

function formatTime(ts: unknown): string {
  const date = toDate(ts)
  if (!date) return ''
  return format(date, 'HH:mm:ss')
}

interface ProgressDetailModalProps {
  show: boolean
  onClose: () => void
  request: AIWriteRequest
  progressMessages?: Array<{ message: string; timestamp: unknown }>
}

export function ProgressDetailModal({
  show,
  onClose,
  request,
  progressMessages,
}: ProgressDetailModalProps) {
  const [mounted, setMounted] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)
  const wasNearBottomRef = useRef(true)
  useEffect(() => { setMounted(true) }, [])

  // 스크롤이 하단 근처인지 기록
  const handleTimelineScroll = useCallback(() => {
    const el = timelineRef.current
    if (!el) return
    const threshold = 60
    wasNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  // progressMessages 변경 시 하단 근처였으면 자동 스크롤
  const msgCountRef = useRef(0)
  useEffect(() => {
    const count = progressMessages?.length ?? 0
    const isNew = count > msgCountRef.current
    msgCountRef.current = count

    if (!show || count === 0) return
    if (isNew && !wasNearBottomRef.current) return

    const raf = requestAnimationFrame(() => {
      const el = timelineRef.current
      if (!el) return
      if (isNew) {
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
      } else {
        el.scrollTop = el.scrollHeight
      }
    })
    return () => cancelAnimationFrame(raf)
  }, [show, progressMessages?.length])

  // Body scroll 막기 + 상태 초기화
  useEffect(() => {
    if (!show) {
      wasNearBottomRef.current = true
      return
    }
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
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] flex flex-col bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          >
            {/* Modal Header */}
            <div className={cn(
              "flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0",
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
                    {formatRelativeTimeFns(request.createdAt)} 시작
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Prompt */}
            <div className="border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 px-5 pt-3 pb-1">요청 프롬프트</p>
              <div className="mr-2.5 max-h-[15rem] overflow-y-auto overscroll-contain">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap pl-5 pr-2 pb-3">
                  {request.prompt}
                </p>
              </div>
            </div>

            {/* Attached Images */}
            {request.images && request.images.length > 0 && (
              <ImageGallery images={request.images} />
            )}

            {/* Timeline */}
            <div ref={timelineRef} onScroll={handleTimelineScroll} className="pl-5 pr-2 mr-2.5 py-4 flex-1 min-h-0 overflow-y-auto">
              {progressMessages && progressMessages.length > 0 ? (
                <div className="space-y-4">
                  {progressMessages.map((entry, i) => {
                    const isLatest = i === progressMessages.length - 1
                    const isSuccess = request.status === 'success'
                    const lineColor = isSuccess
                      ? 'bg-green-200 dark:bg-green-800'
                      : 'bg-violet-200 dark:bg-violet-800'
                    return (
                      <motion.div
                        key={`${i}-${entry.message}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30, delay: 0.3 }}
                        className="flex gap-3 relative"
                      >
                        {/* Connector line */}
                        {!isLatest && (
                          <motion.div
                            className={cn("absolute left-[7px] w-px", lineColor)}
                            style={{ top: '9.5px', bottom: '-25px', transformOrigin: 'top' }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ type: 'spring', stiffness: 200, damping: 25, delay: 0.35 }}
                          />
                        )}

                        {/* Dot */}
                        <div className="relative flex-shrink-0 mt-0.5 w-[15px] h-[15px] z-10">
                          <div className={cn(
                            'w-full h-full rounded-full border-2 relative z-[1] transition-colors duration-500',
                            isSuccess
                              ? isLatest
                                ? 'bg-green-500 border-green-500 shadow-md shadow-green-500/30'
                                : 'bg-green-500 border-green-500'
                              : isLatest
                                ? 'bg-white dark:bg-gray-900 border-violet-500 shadow-md shadow-violet-500/30'
                                : 'bg-violet-500 border-violet-500'
                          )} />
                          {isLatest && request.status === 'pending' && (
                            <div
                              className="absolute -inset-[2px] rounded-full bg-violet-400/25"
                              style={{ animation: 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite' }}
                            />
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
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              {request.status === 'success' ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {request.completedAt ? formatRelativeTimeFns(request.completedAt) + ' 완료' : '완료됨'}
                  </span>
                  {request.resultPostId && (
                    <Link
                      href={`/posts/${request.resultPostId}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500 hover:bg-green-600 text-white transition-colors"
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
