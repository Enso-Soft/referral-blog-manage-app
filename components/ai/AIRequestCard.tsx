'use client'

import { useState, useCallback } from 'react'
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
} from 'lucide-react'
import { cn, formatRelativeTimeFns } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressDetailModal } from './ProgressDetailModal'
import type { AIWriteRequest } from '@/lib/schemas/aiRequest'
import Link from 'next/link'

interface AIRequestCardProps {
  request: AIWriteRequest
  onRetry: (request: AIWriteRequest) => void
  onDelete: (requestId: string) => Promise<void>
  onDismiss: (requestId: string) => Promise<void>
  onClick: (request: AIWriteRequest) => void
  onPendingClick?: () => void
  className?: string
}

export function AIRequestCard({
  request,
  onRetry,
  onDelete,
  onDismiss,
  onClick,
  className,
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
          className,
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
          <Badge
            className={cn(
              'border-transparent',
              isPending && 'bg-violet-500 text-white hover:bg-violet-500',
              isSuccess && 'bg-green-500 text-white hover:bg-green-500',
              isFailed && 'bg-red-500 text-white hover:bg-red-500'
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
          </Badge>

          {isSuccess && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDismiss}
              disabled={isDismissing}
              className={cn(
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
            </Button>
          )}

          {isFailed && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className={cn(
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
            </Button>
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
            {formatRelativeTimeFns(request.createdAt)}
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
            <Button
              variant="default"
              size="sm"
              onClick={handleRetry}
              className="bg-violet-500 hover:bg-violet-600 text-white text-xs gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              재시도
            </Button>
          )}
        </div>
      </motion.div>

      {/* Progress Detail Modal */}
      <ProgressDetailModal
        show={showDetail}
        onClose={() => setShowDetail(false)}
        request={request}
        progressMessages={progressMessages}
      />
    </>
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
