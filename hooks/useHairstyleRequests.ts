'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { type HairstyleRequest } from '@/lib/schemas/hairstyleRequest'

/**
 * 단일 ai_hairstyle_requests 문서를 실시간 구독.
 * requestId가 null이면 구독하지 않음 (유휴 상태에서 Firestore 읽기 0).
 */
export function useHairstyleRequestStatus(requestId: string | null) {
  const [request, setRequest] = useState<HairstyleRequest | null>(null)

  useEffect(() => {
    if (!requestId) {
      setRequest(null)
      return
    }

    const db = getFirebaseDb()
    const docRef = doc(db, 'ai_hairstyle_requests', requestId)

    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setRequest({ id: snap.id, ...snap.data() } as HairstyleRequest)
      }
    })
  }, [requestId])

  return request
}
