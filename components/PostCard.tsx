'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Clock, FileText, Tag, Send, FileEdit, Loader2, MoreVertical, Calendar, RotateCcw } from 'lucide-react'
import type { BlogPost } from '@/lib/firestore'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface PostCardProps {
  post: BlogPost
  onStatusChange?: (postId: string, newStatus: 'draft' | 'published') => Promise<boolean>
}

export function PostCard({ post, onStatusChange }: PostCardProps) {
  const [status, setStatus] = useState(post.status)
  const [isChanging, setIsChanging] = useState(false)
  // content에서 첫 번째 이미지 추출
  const thumbnail = post.content?.match(/<img[^>]+src=["']([^"']+)["']/)?.[1]

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ''
    // Firestore Timestamp 형식 처리
    let date: Date
    if (timestamp._seconds) {
      date = new Date(timestamp._seconds * 1000)
    } else if (typeof timestamp.toDate === 'function') {
      date = timestamp.toDate()
    } else {
      date = new Date(timestamp)
    }

    if (isNaN(date.getTime())) return ''

    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date)
  }

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onStatusChange || !post.id) return

    const newStatus = status === 'draft' ? 'published' : 'draft'
    setIsChanging(true)

    try {
      const success = await onStatusChange(post.id, newStatus)
      if (success) {
        setStatus(newStatus)
      }
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <Link href={`/posts/${post.id}`} className="block group h-full">
      <article className="h-full bg-card hover:bg-card/80 border border-border hover:border-border/80 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex flex-col">
        {/* Thumbnail Section */}
        <div className="aspect-[16/9] relative overflow-hidden bg-secondary/50">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <FileText className="w-12 h-12" />
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-3 left-3 flex gap-2">
            <span
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded-full backdrop-blur-md shadow-sm border",
                status === 'published'
                  ? "bg-green-500/10 text-green-600 border-green-200/50 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-200/50 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/20"
              )}
            >
              {status === 'published' ? '발행됨' : '초안'}
            </span>
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
          <h3 className="text-lg font-bold text-card-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {post.title || "제목 없음"}
          </h3>

          {/* Excerpt */}
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
            {post.content.replace(/<[^>]*>/g, '').slice(0, 120) || "내용 미리보기가 없습니다..."}
          </p>

          {/* Footer Actions */}
          <div className="pt-4 mt-auto border-t border-border flex items-center justify-between">

            {/* Keywords */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              {post.keywords?.slice(0, 2).map((keyword, i) => (
                <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-secondary text-secondary-foreground rounded-md">
                  #{keyword}
                </span>
              ))}
              {post.keywords && post.keywords.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{post.keywords.length - 2}</span>
              )}
            </div>

            {/* Quick Action */}
            {onStatusChange && (
              <button
                onClick={handleStatusToggle}
                disabled={isChanging}
                className={cn(
                  "relative z-10 flex items-center gap-1.5 pl-3 text-xs font-medium transition-colors disabled:opacity-50",
                  status === 'draft'
                    ? "text-primary hover:text-primary/80"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {isChanging ? (
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
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
