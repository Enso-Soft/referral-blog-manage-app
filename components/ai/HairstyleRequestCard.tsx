'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Loader2,
  XCircle,
  CheckCircle,
  X,
  Scissors,
  Download,
} from 'lucide-react'
import { cn, formatRelativeTimeFns, downloadImage } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { HairstyleRequest } from '@/lib/schemas/hairstyleRequest'

interface HairstyleRequestCardProps {
  request: HairstyleRequest
  onDelete: (requestId: string) => Promise<void>
  onDismiss: (requestId: string) => Promise<void>
  onClick?: (request: HairstyleRequest) => void
  className?: string
}

export function HairstyleRequestCard({
  request,
  onDelete,
  onDismiss,
  onClick,
  className,
}: HairstyleRequestCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDismissing, setIsDismissing] = useState(false)

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

  const isPending = request.status === 'pending'
  const isSuccess = request.status === 'success'
  const isFailed = request.status === 'failed'

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const url = request.resultImageUrls?.[0]
    if (!url) return
    downloadImage(url, `hairstyle-${Date.now()}.webp`)
  }, [request.resultImageUrls])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      onClick={() => onClick?.(request)}
      className={cn(
        'relative cursor-pointer',
        'p-4 rounded-xl flex gap-3',
        'border',
        className,
        isPending && [
          'bg-violet-50 dark:bg-violet-950/30',
          'border-violet-200 dark:border-violet-800/50',
        ],
        isSuccess && [
          'bg-green-50 dark:bg-green-950/30',
          'border-green-200 dark:border-green-800/50',
        ],
        isFailed && [
          'bg-red-50 dark:bg-red-950/20',
          'border-red-200 dark:border-red-800/40',
        ]
      )}
    >
      {/* 얼굴 썸네일 */}
      <div className="flex-shrink-0 relative">
        <img
          src={request.faceImageUrl}
          alt="얼굴"
          className="w-16 h-16 object-cover rounded-lg"
        />
        {isSuccess && request.resultImageUrls?.[0] && (
          <img
            src={request.resultImageUrls[0]}
            alt="결과"
            className="absolute -bottom-1 -right-1 w-10 h-10 object-cover rounded-lg border-2 border-white dark:border-gray-900 shadow-sm"
          />
        )}
      </div>

      {/* 내용 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <Badge
            className={cn(
              'border-transparent text-xs',
              isPending && 'bg-violet-500 text-white hover:bg-violet-500',
              isSuccess && 'bg-green-500 text-white hover:bg-green-500',
              isFailed && 'bg-red-500 text-white hover:bg-red-500'
            )}
          >
            {isPending && (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>생성중</span>
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

          <div className="flex items-center gap-1">
            {isSuccess && (
              <>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDownload}
                  className="text-gray-400 hover:text-green-600"
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDismiss}
                  disabled={isDismissing}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {isDismissing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                </Button>
              </>
            )}
            {isFailed && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-gray-400 hover:text-red-500"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              </Button>
            )}
            {isPending && (
              <Scissors className="w-4 h-4 text-violet-500 animate-pulse" />
            )}
          </div>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-1">
          {request.prompt || (request.hairstyleImageUrl ? '이미지 참조 스타일' : '헤어스타일 변환')}
        </p>

        {isFailed && request.errorMessage && (
          <p className="text-xs text-red-500 dark:text-red-400 line-clamp-1 mt-1">
            {request.errorMessage}
          </p>
        )}

        <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 block">
          {formatRelativeTimeFns(request.createdAt)}
        </span>
      </div>
    </motion.div>
  )
}
