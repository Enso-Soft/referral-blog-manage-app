'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Sparkles,
  Send,
  Loader2,
  RotateCcw,
  AlertCircle,
  User,
  Bot,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import type { ConversationMessage } from '@/lib/schemas/aiRequest'

interface AIChatModalProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

interface AIChatContentProps {
  postId: string
  isOpen: boolean
}

interface ChatMessage extends Omit<ConversationMessage, 'createdAt'> {
  createdAt: Date
}

// SlidePanel 내부에서 사용하는 채팅 콘텐츠 컴포넌트
export function AIChatContent({ postId, isOpen }: AIChatContentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { authFetch } = useAuthFetch()

  // Firestore에서 대화 이력 실시간 구독
  useEffect(() => {
    if (!isOpen || !postId) return

    setLoadingMessages(true)
    const db = getFirebaseDb()
    const conversationsRef = collection(db, 'blog_posts', postId, 'conversations')
    const q = query(conversationsRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data()
          let createdAt: Date

          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate()
          } else if (data.createdAt?._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000)
          } else {
            createdAt = new Date()
          }

          return {
            id: docSnap.id,
            role: data.role as 'user' | 'assistant',
            content: data.content as string,
            status: data.status as 'pending' | 'success' | 'failed',
            createdAt,
          }
        })
        setMessages(msgs)
        setLoadingMessages(false)
      },
      (error) => {
        console.error('Conversation subscription error:', error)
        setLoadingMessages(false)
      }
    )

    return () => unsubscribe()
  }, [isOpen, postId])

  // 스크롤 to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 메시지 전송
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    setInput('')
    setIsLoading(true)

    const db = getFirebaseDb()
    const conversationsRef = collection(db, 'blog_posts', postId, 'conversations')

    await addDoc(conversationsRef, {
      role: 'user',
      content: trimmedInput,
      status: 'success',
      createdAt: Timestamp.now(),
    })

    const aiMsgRef = await addDoc(conversationsRef, {
      role: 'assistant',
      content: '',
      status: 'pending',
      createdAt: Timestamp.now(),
    })

    try {
      const res = await authFetch('/api/ai/blog-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          message: trimmedInput,
          messageId: aiMsgRef.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || '요청에 실패했습니다')
      }

      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', aiMsgRef.id), {
        content: data.response || '응답을 받았습니다.',
        status: 'success',
      })
    } catch (error) {
      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', aiMsgRef.id), {
        content: error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.',
        status: 'failed',
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, postId, authFetch])

  // 재시도
  const handleRetry = useCallback(async (messageId: string, originalContent: string) => {
    if (isLoading) return

    setIsLoading(true)
    const db = getFirebaseDb()

    await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
      content: '',
      status: 'pending',
    })

    try {
      const res = await authFetch('/api/ai/blog-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          message: originalContent,
          messageId,
          isRetry: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '재시도에 실패했습니다')
      }

      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
        content: data.response || '응답을 받았습니다.',
        status: 'success',
      })
    } catch (error) {
      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
        content: error instanceof Error ? error.message : '재시도에 실패했습니다.',
        status: 'failed',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, postId, authFetch])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const findPreviousUserMessage = (messageIndex: number) => {
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content
      }
    }
    return ''
  }

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>AI에게 글 수정을 요청해보세요</p>
            <p className="text-xs mt-1 text-gray-500">
              예: &ldquo;소개 부분을 좀 더 흥미롭게 수정해줘&rdquo;
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              onRetry={() => handleRetry(msg.id, findPreviousUserMessage(idx))}
              isLoading={isLoading && msg.status === 'pending'}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지 입력..."
            disabled={isLoading}
            rows={1}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       placeholder:text-gray-400 dark:placeholder:text-gray-500
                       focus:ring-2 focus:ring-violet-500 focus:border-transparent
                       resize-none disabled:opacity-50 disabled:cursor-not-allowed
                       max-h-24 overflow-y-auto"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className={cn(
              'p-2.5 rounded-xl transition-all',
              'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white',
              'hover:from-violet-600 hover:to-fuchsia-600',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'shadow-md hover:shadow-lg'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        {isLoading && (
          <p className="text-xs text-gray-400 mt-2 text-center">
            AI가 응답 중입니다...
          </p>
        )}
      </div>
    </div>
  )
}

// 기존 AIChatModal (하위 호환)
export function AIChatModal({ postId, isOpen, onClose }: AIChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { authFetch } = useAuthFetch()

  // Firestore에서 대화 이력 실시간 구독
  useEffect(() => {
    if (!isOpen || !postId) return

    setLoadingMessages(true)
    const db = getFirebaseDb()
    const conversationsRef = collection(db, 'blog_posts', postId, 'conversations')
    const q = query(conversationsRef, orderBy('createdAt', 'asc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((doc) => {
          const data = doc.data()
          let createdAt: Date

          if (data.createdAt?.toDate) {
            createdAt = data.createdAt.toDate()
          } else if (data.createdAt?._seconds) {
            createdAt = new Date(data.createdAt._seconds * 1000)
          } else {
            createdAt = new Date()
          }

          return {
            id: doc.id,
            role: data.role as 'user' | 'assistant',
            content: data.content as string,
            status: data.status as 'pending' | 'success' | 'failed',
            createdAt,
          }
        })
        setMessages(msgs)
        setLoadingMessages(false)
      },
      (error) => {
        console.error('Conversation subscription error:', error)
        setLoadingMessages(false)
      }
    )

    return () => unsubscribe()
  }, [isOpen, postId])

  // 스크롤 to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  // 메시지 전송
  const handleSend = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading) return

    setInput('')
    setIsLoading(true)

    const db = getFirebaseDb()
    const conversationsRef = collection(db, 'blog_posts', postId, 'conversations')

    // 사용자 메시지 먼저 저장
    const userMsgRef = await addDoc(conversationsRef, {
      role: 'user',
      content: trimmedInput,
      status: 'success',
      createdAt: Timestamp.now(),
    })

    // AI 응답 placeholder 추가
    const aiMsgRef = await addDoc(conversationsRef, {
      role: 'assistant',
      content: '',
      status: 'pending',
      createdAt: Timestamp.now(),
    })

    try {
      // AI API 호출
      const res = await authFetch('/api/ai/blog-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          message: trimmedInput,
          messageId: aiMsgRef.id,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || '요청에 실패했습니다')
      }

      // 성공 시 AI 메시지 업데이트
      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', aiMsgRef.id), {
        content: data.response || '응답을 받았습니다.',
        status: 'success',
      })
    } catch (error) {
      // 실패 시 AI 메시지 업데이트
      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', aiMsgRef.id), {
        content: error instanceof Error ? error.message : '요청 처리 중 오류가 발생했습니다.',
        status: 'failed',
      })
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, postId, authFetch])

  // 재시도
  const handleRetry = useCallback(async (messageId: string, originalContent: string) => {
    if (isLoading) return

    setIsLoading(true)
    const db = getFirebaseDb()

    // 기존 AI 메시지 업데이트
    await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
      content: '',
      status: 'pending',
    })

    try {
      const res = await authFetch('/api/ai/blog-editor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          message: originalContent,
          messageId,
          isRetry: true,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '재시도에 실패했습니다')
      }

      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
        content: data.response || '응답을 받았습니다.',
        status: 'success',
      })
    } catch (error) {
      await updateDoc(doc(db, 'blog_posts', postId, 'conversations', messageId), {
        content: error instanceof Error ? error.message : '재시도에 실패했습니다.',
        status: 'failed',
      })
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, postId, authFetch])

  // Enter로 전송 (Shift+Enter는 줄바꿈)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // 이전 사용자 메시지 찾기 (재시도용)
  const findPreviousUserMessage = (messageIndex: number) => {
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content
      }
    }
    return ''
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-20 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)]
                     bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden
                     border border-gray-200 dark:border-gray-800
                     flex flex-col max-h-[70vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10
                          dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20
                          border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">
                AI 글 수정 도우미
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[200px]">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Bot className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>AI에게 글 수정을 요청해보세요</p>
                <p className="text-xs mt-1 text-gray-500">
                  예: &ldquo;소개 부분을 좀 더 흥미롭게 수정해줘&rdquo;
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onRetry={() => handleRetry(msg.id, findPreviousUserMessage(idx))}
                  isLoading={isLoading && msg.status === 'pending'}
                />
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지 입력..."
                disabled={isLoading}
                rows={1}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           placeholder:text-gray-400 dark:placeholder:text-gray-500
                           focus:ring-2 focus:ring-violet-500 focus:border-transparent
                           resize-none disabled:opacity-50 disabled:cursor-not-allowed
                           max-h-24 overflow-y-auto"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white',
                  'hover:from-violet-600 hover:to-fuchsia-600',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'shadow-md hover:shadow-lg'
                )}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            {isLoading && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                AI가 응답 중입니다...
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// 메시지 버블 컴포넌트
function MessageBubble({
  message,
  onRetry,
  isLoading,
}: {
  message: ChatMessage
  onRetry: () => void
  isLoading: boolean
}) {
  const isUser = message.role === 'user'
  const isFailed = message.status === 'failed'
  const isPending = message.status === 'pending'

  return (
    <div className={cn('flex gap-2', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div
        className={cn(
          'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-gray-200 dark:bg-gray-700'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
        )}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
          isUser
            ? 'bg-violet-500 text-white rounded-tr-none'
            : isFailed
              ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-tl-none border border-red-200 dark:border-red-800'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-none'
        )}
      >
        {isPending && !message.content ? (
          <div className="flex items-center gap-1.5">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        {/* Failed indicator */}
        {isFailed && !isUser && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5" />
            <button
              onClick={onRetry}
              disabled={isLoading}
              className="flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50"
            >
              <RotateCcw className="w-3 h-3" />
              재시도
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

