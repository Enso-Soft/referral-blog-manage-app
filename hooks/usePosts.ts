'use client'

import { usePostsContext } from '@/context/PostsProvider'

export function usePosts() {
  return usePostsContext()
}

