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
import { useAuth } from '@/components/layout/AuthProvider'
import { AIWriteRequestSchema, type AIWriteRequest, type AIRequestStatus } from '@/lib/schemas/aiRequest'

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
        const newRequests = snapshot.docs.map((doc) => {
          const data = { id: doc.id, ...doc.data() }
          if (process.env.NODE_ENV === 'development') {
            const result = AIWriteRequestSchema.safeParse(data)
            if (!result.success) {
              console.warn(`[useAIWriteRequests] Validation failed for doc ${doc.id}:`, result.error.flatten().fieldErrors)
            }
          }
          return data
        }) as AIWriteRequest[]

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
  }, [user?.uid, authLoading])

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

// 상대 시간 포맷 유틸 — date-fns 기반으로 마이그레이션됨
// 기존 import 호환을 위해 re-export
export { formatRelativeTimeFns as formatRelativeTime } from '@/lib/utils'
