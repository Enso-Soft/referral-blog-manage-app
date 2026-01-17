'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  type Query,
  type DocumentData,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import type { BlogPost } from '@/lib/firestore'

type StatusFilter = 'all' | 'draft' | 'published'

interface UsePostsOptions {
  filter?: StatusFilter
}

interface UsePostsReturn {
  posts: BlogPost[]
  loading: boolean
  error: string | null
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  const { filter = 'all' } = options
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // 인증 로딩 중이면 대기
    if (authLoading) {
      return
    }

    // 로그인 안 된 경우
    if (!user) {
      setPosts([])
      setLoading(false)
      setError('로그인이 필요합니다')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const db = getFirebaseDb()
      const postsRef = collection(db, 'blog_posts')

      // 쿼리 조건 구성
      const constraints: any[] = []

      // Admin이 아니면 본인 글만
      if (!isAdmin) {
        constraints.push(where('userId', '==', user.uid))
      }

      // 상태 필터
      if (filter !== 'all') {
        constraints.push(where('status', '==', filter))
      }

      // 정렬
      constraints.push(orderBy('createdAt', 'desc'))

      const q = query(postsRef, ...constraints) as Query<DocumentData>

      // 실시간 구독
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const postsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as BlogPost[]
          setPosts(postsData)
          setLoading(false)
        },
        (err) => {
          console.error('Firestore subscription error:', err)
          setError('데이터를 불러오는 중 오류가 발생했습니다')
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Failed to setup subscription:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다')
      setLoading(false)
    }
  }, [user, isAdmin, authLoading, filter])

  return { posts, loading, error }
}
