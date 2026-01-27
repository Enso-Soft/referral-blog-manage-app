'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import type { AIWriteRequest, AIRequestStatus } from '@/lib/schemas/aiRequest'

const ITEMS_PER_PAGE = 10

interface UseAIWriteRequestsReturn {
  requests: AIWriteRequest[]
  loading: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => Promise<void>
  refresh: () => void
  // 새로 완료된 요청 감지용
  latestCompletedRequest: AIWriteRequest | null
  clearLatestCompleted: () => void
}

export function useAIWriteRequests(): UseAIWriteRequestsReturn {
  const { user, loading: authLoading } = useAuth()
  const [requests, setRequests] = useState<AIWriteRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)

  // 새로 완료된 요청 추적 (알림용)
  const [latestCompletedRequest, setLatestCompletedRequest] = useState<AIWriteRequest | null>(null)
  const previousPendingIds = useRef<Set<string>>(new Set())

  const clearLatestCompleted = useCallback(() => {
    setLatestCompletedRequest(null)
  }, [])

  // 실시간 구독
  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setRequests([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const db = getFirebaseDb()
    const requestsRef = collection(db, 'ai_write_requests')
    const q = query(
      requestsRef,
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(ITEMS_PER_PAGE)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const newRequests = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as AIWriteRequest[]

        // 새로 완료된 요청 감지
        const currentPendingIds = new Set(
          newRequests.filter(r => r.status === 'pending').map(r => r.id)
        )

        // 이전에 pending이었는데 지금 완료된 요청 찾기
        newRequests.forEach(req => {
          if (
            (req.status === 'success' || req.status === 'failed') &&
            previousPendingIds.current.has(req.id)
          ) {
            setLatestCompletedRequest(req)
          }
        })

        previousPendingIds.current = currentPendingIds

        setRequests(newRequests)
        setHasMore(snapshot.docs.length === ITEMS_PER_PAGE)
        if (snapshot.docs.length > 0) {
          setLastDoc(snapshot.docs[snapshot.docs.length - 1])
        }
        setLoading(false)
      },
      (err) => {
        console.error('AI requests subscription error:', err)
        setError('요청 이력을 불러오는 중 오류가 발생했습니다')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, authLoading])

  // 더 불러오기 (페이지네이션)
  const loadMore = useCallback(async () => {
    if (!user || !lastDoc || !hasMore) return

    try {
      const db = getFirebaseDb()
      const requestsRef = collection(db, 'ai_write_requests')
      const q = query(
        requestsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(ITEMS_PER_PAGE)
      )

      const snapshot = await getDocs(q)
      const newRequests = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as AIWriteRequest[]

      setRequests(prev => [...prev, ...newRequests])
      setHasMore(snapshot.docs.length === ITEMS_PER_PAGE)
      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1])
      }
    } catch (err) {
      console.error('Failed to load more requests:', err)
    }
  }, [user, lastDoc, hasMore])

  const refresh = useCallback(() => {
    setLastDoc(null)
  }, [])

  return {
    requests,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    latestCompletedRequest,
    clearLatestCompleted,
  }
}

// 상대 시간 포맷 유틸
export function formatRelativeTime(timestamp: unknown): string {
  let date: Date

  if (timestamp && typeof timestamp === 'object') {
    if ('toDate' in timestamp && typeof (timestamp as { toDate: () => Date }).toDate === 'function') {
      date = (timestamp as { toDate: () => Date }).toDate()
    } else if ('_seconds' in timestamp) {
      date = new Date((timestamp as { _seconds: number })._seconds * 1000)
    } else if ('seconds' in timestamp) {
      date = new Date((timestamp as { seconds: number }).seconds * 1000)
    } else {
      return ''
    }
  } else if (timestamp instanceof Date) {
    date = timestamp
  } else {
    return ''
  }

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return '방금 전'
  if (diffMin < 60) return `${diffMin}분 전`
  if (diffHour < 24) return `${diffHour}시간 전`
  if (diffDay < 7) return `${diffDay}일 전`

  return date.toLocaleDateString('ko-KR')
}
