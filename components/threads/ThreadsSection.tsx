'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Send,
  Edit3,
  Save,
  X,
  Hash,
  Link2,
  ImageIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { formatDateFns } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ThreadsContent } from '@/lib/schemas'

interface ThreadsSectionProps {
  postId: string
  threads: ThreadsContent
  onUpdate?: () => void
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    not_posted: { label: '미포스팅', icon: Clock, className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' },
    posted: { label: '포스팅됨', icon: CheckCircle2, className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    failed: { label: '실패', icon: XCircle, className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  }[status] || { label: status, icon: Clock, className: 'bg-gray-100 text-gray-600' }

  const Icon = config.icon
  return (
    <Badge variant="outline" className={`border-transparent ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </Badge>
  )
}

export function ThreadsSection({ postId, threads, onUpdate }: ThreadsSectionProps) {
  const { authFetch } = useAuthFetch()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(threads.text || '')
  const [hashtag, setHashtag] = useState(threads.hashtag || '')
  const [linkUrl, setLinkUrl] = useState(threads.linkUrl || '')
  const [imageUrl, setImageUrl] = useState(threads.imageUrl || '')
  const [saving, setSaving] = useState(false)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError('')
    try {
      const updateBody: Record<string, unknown> = { threads: { text } }
      if (hashtag) (updateBody.threads as Record<string, unknown>).hashtag = hashtag
      if (linkUrl) (updateBody.threads as Record<string, unknown>).linkUrl = linkUrl
      if (imageUrl) (updateBody.threads as Record<string, unknown>).imageUrl = imageUrl

      const res = await authFetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateBody),
      })
      const data = await res.json()
      if (data.success) {
        setEditing(false)
        onUpdate?.()
      } else {
        setError(data.error || '저장에 실패했습니다')
      }
    } catch {
      setError('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }, [postId, text, hashtag, linkUrl, imageUrl, authFetch, onUpdate])

  const handlePost = useCallback(async () => {
    setPosting(true)
    setError('')
    setSuccessMessage('')
    try {
      const res = await authFetch('/api/threads/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccessMessage('Threads에 포스팅되었습니다!')
        setTimeout(() => setSuccessMessage(''), 3000)
        onUpdate?.()
      } else {
        setError(data.error || 'Threads 포스팅에 실패했습니다')
      }
    } catch {
      setError('Threads 포스팅에 실패했습니다')
    } finally {
      setPosting(false)
    }
  }, [postId, authFetch, onUpdate])

  const handleCancel = useCallback(() => {
    setText(threads.text || '')
    setHashtag(threads.hashtag || '')
    setLinkUrl(threads.linkUrl || '')
    setImageUrl(threads.imageUrl || '')
    setEditing(false)
    setError('')
  }, [threads])

  const charCount = text.length

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusBadge status={threads.postStatus || 'not_posted'} />
          {threads.postedAt && (
            <span className="text-xs text-muted-foreground">
              {formatDateFns(threads.postedAt)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {!editing && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-foreground"
              title="편집"
            >
              <Edit3 className="w-4 h-4" />
            </Button>
          )}
          {threads.threadsPostId && (
            <a
              href={`https://www.threads.net/post/${threads.threadsPostId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Threads에서 보기"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* 본문 */}
      {editing ? (
        <div className="space-y-3">
          <div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              className="resize-none"
              rows={4}
              placeholder="Threads 본문 (500자 이내)"
            />
            <div className="flex justify-end mt-1">
              <span className={`text-xs ${charCount > 480 ? 'text-red-500' : 'text-muted-foreground'}`}>
                {charCount}/500
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="text"
                value={hashtag}
                onChange={(e) => setHashtag(e.target.value)}
                placeholder="해시태그 (#태그1 #태그2)"
                className="flex-1 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="링크 URL"
                className="flex-1 h-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <Input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="이미지 URL"
                className="flex-1 h-8 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={saving || !text.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              저장
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
            >
              <X className="w-3.5 h-3.5" />
              취소
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{threads.text}</p>
          <div className="flex justify-end mt-1">
            <span className="text-xs text-muted-foreground">{threads.text?.length || 0}/500</span>
          </div>

          {/* 부가 정보 */}
          <div className="mt-2 space-y-1">
            {threads.hashtag && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                <Hash className="w-3 h-3" />
                {threads.hashtag}
              </div>
            )}
            {threads.linkUrl && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Link2 className="w-3 h-3" />
                <a href={threads.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate">
                  {threads.linkUrl}
                </a>
              </div>
            )}
            {threads.imageUrl && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ImageIcon className="w-3 h-3" />
                <span className="truncate">{threads.imageUrl}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {(error || threads.errorMessage) && (
        <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p className="text-xs text-red-600 dark:text-red-400">{error || threads.errorMessage}</p>
        </div>
      )}

      {/* 성공 메시지 */}
      {successMessage && (
        <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <p className="text-xs text-green-600 dark:text-green-400">{successMessage}</p>
        </div>
      )}

      {/* 포스팅 버튼 */}
      {!editing && threads.postStatus !== 'posted' && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="default"
            onClick={handlePost}
            disabled={posting}
            className="w-full bg-gray-900 dark:bg-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            {posting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {posting ? '포스팅 중...' : 'Threads에 포스팅'}
          </Button>
        </div>
      )}
    </motion.div>
  )
}
