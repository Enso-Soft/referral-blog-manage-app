'use client'

import { usePostsContext } from '@/context/PostsProvider'
import type { BlogPost } from '@/lib/firestore'

type StatusFilter = 'all' | 'draft' | 'published'

interface UsePostsOptions {
  filter?: StatusFilter // Filter is now managed globally, this option might be deprecated or used to set initial filter if needed, but for now we follow the plan to use context
}

interface UsePostsReturn {
  posts: BlogPost[]
  loading: boolean
  error: string | null
  filter: StatusFilter
  setFilter: (filter: StatusFilter) => void
  typeFilter: 'all' | 'general' | 'affiliate'
  setTypeFilter: (filter: 'all' | 'general' | 'affiliate') => void
  scrollPosition: number
  setScrollPosition: (position: number) => void
  loadingMore: boolean
  hasMore: boolean
  loadMore: () => void
}

export function usePosts(options: UsePostsOptions = {}): UsePostsReturn {
  // We ignore options.filter here because we want the global filter state
  // If we needed to support local overrides, we'd need a more complex logic,
  // but for this task, global persistence is the goal.
  return usePostsContext()
}

