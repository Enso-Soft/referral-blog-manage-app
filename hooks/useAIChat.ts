'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { toDate } from '@/lib/utils'
import { useAuthFetch } from '@/hooks/useAuthFetch'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status: 'pending' | 'success' | 'failed'
  createdAt: Date
}

interface UseAIChatOptions {
  postId: string
  isOpen: boolean
}

export function useAIChat({ postId, isOpen }: UseAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { authFetch } = useAuthFetch()

  // Firestore 실시간 구독
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
          return {
            id: docSnap.id,
            role: data.role as 'user' | 'assistant',
            content: data.content as string,
            status: data.status as 'pending' | 'success' | 'failed',
            createdAt: toDate(data.createdAt) ?? new Date(),
          }
        })
        setMessages(msgs)
        setLoadingMessages(false)
      },
      () => {
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
          conversationHistory: [
            ...messages
              .filter(m => m.status === 'success' && m.content)
              .map(m => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: trimmedInput },
          ],
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
          conversationHistory: messages
            .filter(m => m.status === 'success' && m.content)
            .map(m => ({ role: m.role, content: m.content })),
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
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  // 이전 사용자 메시지 찾기 (재시도용)
  const findPreviousUserMessage = useCallback((messageIndex: number) => {
    for (let i = messageIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        return messages[i].content
      }
    }
    return ''
  }, [messages])

  return {
    messages,
    input,
    setInput,
    isLoading,
    loadingMessages,
    messagesEndRef,
    inputRef,
    handleSend,
    handleRetry,
    handleKeyDown,
    findPreviousUserMessage,
  }
}
