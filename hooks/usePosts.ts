'use client'

import { useState, useEffect } from 'react'
import { subscribeToPosts, type BlogPost } from '@/lib/firestore'

export function usePosts(status?: 'draft' | 'published') {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToPosts((newPosts) => {
        setPosts(newPosts)
        setLoading(false)
      }, status)

      return () => unsubscribe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts')
      setLoading(false)
    }
  }, [status])

  return { posts, loading, error }
}
