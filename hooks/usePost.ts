'use client'

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import type { BlogPost } from '@/lib/firestore'

interface UsePostReturn {
  post: BlogPost | null
  loading: boolean
  error: string | null
}

export function usePost(postId: string | null): UsePostReturn {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // postId가 없으면 대기
    if (!postId) {
      setLoading(false)
      setError('포스트 ID가 없습니다')
      return
    }

    // 인증 로딩 중이면 대기
    if (authLoading) {
      return
    }

    // 로그인 안 된 경우
    if (!user) {
      setPost(null)
      setLoading(false)
      setError('로그인이 필요합니다')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const db = getFirebaseDb()
      const postRef = doc(db, 'blog_posts', postId)

      // 실시간 구독
      const unsubscribe = onSnapshot(
        postRef,
        (docSnapshot) => {
          if (!docSnapshot.exists()) {
            setPost(null)
            setError('포스트를 찾을 수 없습니다')
            setLoading(false)
            return
          }

          const data = docSnapshot.data()

          // 권한 확인: Admin이 아니면 본인 글만
          if (!isAdmin && data.userId !== user.uid) {
            setPost(null)
            setError('이 포스트에 접근할 권한이 없습니다')
            setLoading(false)
            return
          }

          setPost({
            id: docSnapshot.id,
            ...data,
          } as BlogPost)
          setError(null)
          setLoading(false)
        },
        (err) => {
          console.error('Firestore post subscription error:', err)
          setError('데이터를 불러오는 중 오류가 발생했습니다')
          setLoading(false)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Failed to setup post subscription:', err)
      setError('데이터를 불러오는 중 오류가 발생했습니다')
      setLoading(false)
    }
  }, [postId, user, isAdmin, authLoading])

  return { post, loading, error }
}
