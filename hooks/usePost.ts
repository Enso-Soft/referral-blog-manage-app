'use client'

import { useState, useEffect } from 'react'
import { subscribeToPost, type BlogPost } from '@/lib/firestore'

export function usePost(id: string) {
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const unsubscribe = subscribeToPost(id, (newPost) => {
        setPost(newPost)
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load post')
      setLoading(false)
    }
  }, [id])

  return { post, loading, error }
}
