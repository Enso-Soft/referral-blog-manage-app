'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Clock, FileText, Tag, Send, FileEdit, Loader2, MoreVertical, Calendar, RotateCcw } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'
import { cn, formatDate } from '@/lib/utils'
import { motion } from 'framer-motion'
import { PublishedBadge } from '@/components/PublishedBadge'

interface PostCardProps {
  post: BlogPost
  onStatusChange?: (postId: string, newStatus: 'draft' | 'published') => Promise<boolean>
  onTypeChange?: (postId: string, newType: 'general' | 'affiliate') => Promise<boolean>
}

export const PostCard = memo(function PostCard({ post, onStatusChange, onTypeChange }: PostCardProps) {
  const [status, setStatus] = useState(post.status)
  const [type, setType] = useState<'general' | 'affiliate'>(post.postType || 'general')
  const [isStatusChanging, setIsStatusChanging] = useState(false)
  const [isTypeChanging, setIsTypeChanging] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Sync state with props when data changes externally (real-time)
  useEffect(() => {
    setStatus(post.status)
  }, [post.status])

  useEffect(() => {
    setType(post.postType || 'general')
  }, [post.postType])

  // Reset image error when thumbnail changes
  useEffect(() => {
    setImageError(false)
  }, [post.content])

  // content에서 첫 번째 이미지 추출 (useMemo로 캐싱)
  const thumbnail = useMemo(
    () => post.content?.match(/<img[^>]+src=["']([^"']+)["']/)?.[1],
    [post.content]
  )

  // WordPress data for PublishedBadge
  const wordpressData = (post as unknown as { wordpress?: Record<string, unknown> }).wordpress
  const publishedUrls = (post as unknown as { publishedUrls?: string[] }).publishedUrls

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onStatusChange || !post.id) return

    const newStatus = status === 'draft' ? 'published' : 'draft'
    setIsStatusChanging(true)

    try {
      const success = await onStatusChange(post.id, newStatus)
      if (success) {
        setStatus(newStatus)
      }
    } finally {
      setIsStatusChanging(false)
    }
  }

  const handleTypeToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onTypeChange || !post.id) return

    const newType = type === 'general' ? 'affiliate' : 'general'
    setIsTypeChanging(true)

    try {
      const success = await onTypeChange(post.id, newType)
      if (success) {
        setType(newType)
      }
    } finally {
      setIsTypeChanging(false)
    }
  }

  return (
    <Link href={`/posts/${post.id}`} className="block group h-full">
      <article className="h-full bg-card hover:bg-card/80 border border-border hover:border-border/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
        {/* Thumbnail Section */}
        <div className="aspect-[16/9] relative overflow-hidden bg-secondary/50">
          {thumbnail && !imageError ? (
            <Image
              src={thumbnail}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImageError(true)}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <FileText className="w-12 h-12" />
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            {status === 'published' ? (
              <PublishedBadge
                wordpress={wordpressData}
                publishedUrls={publishedUrls}
                publishedUrl={post.publishedUrl}
                className="px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm border bg-green-600 text-white border-green-700 shadow-md"
              />
            ) : (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm border bg-amber-500 text-white border-amber-600 shadow-md">
                초안
              </span>
            )}

            {/* Type Badge - Clickable */}
            {onTypeChange && (
              <button
                onClick={handleTypeToggle}
                disabled={isTypeChanging}
                className={cn(
                  "px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm border flex items-center gap-1.5 transition-colors",
                  type === 'affiliate'
                    ? "bg-indigo-600 text-white border-indigo-700" // 제휴
                    : "bg-slate-600 text-white border-slate-700"   // 일반
                )}
              >
                {isTypeChanging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  type === 'affiliate' ? '제휴' : '일반'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col flex-1">
          {/* Meta Top */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(post.createdAt)}</span>
            </div>
            {post.metadata?.wordCount && (
              <div className="flex items-center gap-1">
                <div className="w-1 h-1 rounded-full bg-border" />
                <span>{post.metadata.wordCount.toLocaleString()}자</span>
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-card-foreground line-clamp-2 mb-auto group-hover:text-primary transition-colors">
            {post.title || "제목 없음"}
          </h3>

          {/* Footer Actions */}
          <div className="pt-4 mt-auto border-t border-border">
            {/* Single Row with both buttons */}
            <div className="flex items-center gap-2">
              {/* Status Toggle Button */}
              <button
                onClick={handleStatusToggle}
                disabled={isStatusChanging}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50",
                  status === 'draft'
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                )}
              >
                {isStatusChanging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : status === 'draft' ? (
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

              {/* Type Toggle Button */}
              <button
                onClick={handleTypeToggle}
                disabled={isTypeChanging}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition-all disabled:opacity-50",
                  type === 'affiliate'
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                    : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/40"
                )}
              >
                {isTypeChanging ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : type === 'general' ? (
                  <>
                    <Tag className="w-3.5 h-3.5" />
                    <span>제휴 글로</span>
                  </>
                ) : (
                  <>
                    <Tag className="w-3.5 h-3.5" />
                    <span>일반 글로</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
})
