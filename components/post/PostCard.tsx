'use client'

import { useState, useMemo, memo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { FileText, Tag, Send, Loader2, Calendar, RotateCcw } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'
import { cn, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PublishedBadge } from './PublishedBadge'

interface PostCardProps {
  post: BlogPost
  onStatusChange?: (postId: string, newStatus: 'draft' | 'published') => Promise<boolean>
  onTypeChange?: (postId: string, newType: 'general' | 'affiliate') => Promise<boolean>
  viewMode?: 'grid' | 'list'
}

export const PostCard = memo(function PostCard({ post, onStatusChange, onTypeChange, viewMode = 'grid' }: PostCardProps) {
  const status = post.status
  const type = post.postType || 'general'
  const [isStatusChanging, setIsStatusChanging] = useState(false)
  const [isTypeChanging, setIsTypeChanging] = useState(false)
  const [imageError, setImageError] = useState(false)

  // content에서 첫 번째 이미지 추출 (useMemo로 캐싱)
  const thumbnail = useMemo(
    () => post.content?.match(/<img[^>]+src=["']([^"']+)["']/)?.[1],
    [post.content]
  )

  // WordPress data for PublishedBadge
  const wordpressData = post.wordpress
  const publishedUrls = post.publishedUrls

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onStatusChange || !post.id) return

    const newStatus = status === 'draft' ? 'published' : 'draft'
    setIsStatusChanging(true)

    try {
      await onStatusChange(post.id, newStatus)
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
      await onTypeChange(post.id, newType)
    } finally {
      setIsTypeChanging(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <Link href={`/posts/${post.id}`} className="block group">
        <article className="bg-card hover:bg-card/80 border border-border hover:border-border/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-md">
          {/* Top: Thumbnail + Info row */}
          <div className="flex flex-row items-center">
            {/* Thumbnail */}
            <div className="w-[100px] h-[80px] sm:w-[160px] sm:h-[90px] relative overflow-hidden bg-secondary/50 shrink-0">
              {thumbnail && !imageError ? (
                <Image
                  src={thumbnail}
                  alt={post.title}
                  fill
                  sizes="(max-width: 640px) 100px, 160px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={() => setImageError(true)}
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                  <FileText className="w-8 h-8" />
                </div>
              )}
              {/* Status Badge Overlay */}
              <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2">
                {status === 'published' ? (
                  <PublishedBadge
                    wordpress={wordpressData}
                    publishedUrls={publishedUrls}
                    publishedUrl={post.publishedUrl}
                    className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full shadow-sm border bg-green-600 text-white border-green-700"
                  />
                ) : (
                  <Badge className="px-1.5 py-0.5 text-[10px] shadow-sm bg-amber-500 text-white border-amber-600 hover:bg-amber-500">
                    미발행
                  </Badge>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-3 sm:px-4 py-2 sm:py-3 flex flex-row items-center gap-4 min-w-0">
              {/* Text area */}
              <div className="flex flex-col flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-card-foreground line-clamp-2 sm:line-clamp-1 min-w-0 group-hover:text-primary transition-colors">
                  {post.title || "제목 없음"}
                </h3>
                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground mt-1">
                  <div className="flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(post.createdAt)}</span>
                  </div>
                  {post.metadata?.wordCount && (
                    <span className="shrink-0">{post.metadata.wordCount.toLocaleString()}자</span>
                  )}
                  {/* Type badge */}
                  <span className={cn(
                    "inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded-full",
                    type === 'affiliate'
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-600 text-white"
                  )}>
                    {type === 'affiliate' ? '제휴' : '일반'}
                  </span>
                </div>
              </div>

              {/* Action button - desktop only */}
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleStatusToggle}
                  disabled={isStatusChanging}
                  className={cn(
                    "w-auto text-xs font-medium rounded-lg transition-all",
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
                      <span>미발행으로</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Bottom: Action buttons - mobile only */}
          <div className="sm:hidden px-3 pb-2.5 pt-2.5">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStatusToggle}
                disabled={isStatusChanging}
                className={cn(
                  "flex-1 text-xs font-medium rounded-lg transition-all",
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
                    <span>미발행으로</span>
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTypeToggle}
                disabled={isTypeChanging}
                className={cn(
                  "flex-1 text-xs font-medium rounded-lg transition-all",
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
              </Button>
            </div>
          </div>
        </article>
      </Link>
    )
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
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
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
              <Badge className="backdrop-blur-md shadow-md bg-amber-500 text-white border-amber-600 hover:bg-amber-500">
                미발행
              </Badge>
            )}

            {/* Type Badge - Clickable */}
            {onTypeChange && (
              <Button
                variant="default"
                onClick={handleTypeToggle}
                disabled={isTypeChanging}
                className={cn(
                  "px-2.5 py-1 h-auto text-xs font-semibold rounded-full backdrop-blur-md shadow-sm border flex items-center gap-1.5 transition-colors",
                  type === 'affiliate'
                    ? "bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700" // 제휴
                    : "bg-slate-600 text-white border-slate-700 hover:bg-slate-700"   // 일반
                )}
              >
                {isTypeChanging ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  type === 'affiliate' ? '제휴' : '일반'
                )}
              </Button>
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
              <Button
                variant="secondary"
                size="sm"
                onClick={handleStatusToggle}
                disabled={isStatusChanging}
                className={cn(
                  "flex-1 text-xs font-medium rounded-lg transition-all",
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
                    <span>미발행으로</span>
                  </>
                )}
              </Button>

              {/* Type Toggle Button */}
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTypeToggle}
                disabled={isTypeChanging}
                className={cn(
                  "flex-1 text-xs font-medium rounded-lg transition-all",
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
              </Button>
            </div>
          </div>
        </div>
      </article>
    </Link>
  )
})
