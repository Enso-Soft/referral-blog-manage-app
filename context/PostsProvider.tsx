'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react'
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    type Query,
    type DocumentData,
    type QueryConstraint,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/AuthProvider'
import type { BlogPost } from '@/lib/firestore'

// Types
type StatusFilter = 'all' | 'draft' | 'published'
type TypeFilter = 'all' | 'general' | 'affiliate'

const PAGE_SIZE = 12

interface PostsContextType {
    posts: BlogPost[]
    loading: boolean
    error: string | null
    filter: StatusFilter
    setFilter: (filter: StatusFilter) => void
    typeFilter: TypeFilter
    setTypeFilter: (filter: TypeFilter) => void
    scrollPosition: number
    setScrollPosition: (position: number) => void
    loadingMore: boolean
    hasMore: boolean
    loadMore: () => void
}

const PostsContext = createContext<PostsContextType | undefined>(undefined)

export function PostsProvider({ children }: { children: ReactNode }) {
    const { user, isAdmin, loading: authLoading } = useAuth()
    // rawPosts: Firestore에서 가져온 원본 데이터
    const [rawPosts, setRawPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Pagination state
    const [pageSize, setPageSize] = useState(PAGE_SIZE)
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)

    // Persistent state
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
    const [scrollPosition, setScrollPosition] = useState(0)

    const handleSetFilter = useCallback((newFilter: StatusFilter) => {
        if (newFilter === filter) return
        setFilter(newFilter)
        setPageSize(PAGE_SIZE)
        setRawPosts([])
        setLoading(true)
    }, [filter])

    const handleSetTypeFilter = useCallback((newFilter: TypeFilter) => {
        setTypeFilter(newFilter)
    }, [])

    const loadMore = useCallback(() => {
        if (loadingMore || !hasMore) return
        setLoadingMore(true)
        setPageSize(prev => prev + PAGE_SIZE)
    }, [loadingMore, hasMore])

    // Firestore 구독 (filter, pageSize 의존성, typeFilter는 클라이언트 사이드 필터링)
    useEffect(() => {
        if (authLoading) return

        if (!user) {
            setRawPosts([])
            setLoading(false)
            setError('로그인이 필요합니다')
            return
        }

        setError(null)

        try {
            const db = getFirebaseDb()
            const postsRef = collection(db, 'blog_posts')
            const constraints: QueryConstraint[] = []

            if (!isAdmin) {
                constraints.push(where('userId', '==', user.uid))
            }

            if (filter !== 'all') {
                constraints.push(where('status', '==', filter))
            }

            constraints.push(orderBy('createdAt', 'desc'))
            constraints.push(limit(pageSize))

            const q = query(postsRef, ...constraints) as Query<DocumentData>

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const posts = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as BlogPost[]
                    setRawPosts(posts)
                    setHasMore(snapshot.docs.length >= pageSize)
                    setLoading(false)
                    setLoadingMore(false)
                },
                (err) => {
                    console.error('Firestore subscription error:', err)
                    setError('데이터를 불러오는 중 오류가 발생했습니다')
                    setLoading(false)
                    setLoadingMore(false)
                }
            )

            return () => unsubscribe()
        } catch (err) {
            console.error('Failed to setup subscription:', err)
            setError('데이터를 불러오는 중 오류가 발생했습니다')
            setLoading(false)
            setLoadingMore(false)
        }
    }, [user?.uid, isAdmin, authLoading, filter, pageSize])

    // Client-side filtering for postType (useMemo로 캐싱)
    const posts = useMemo(() => {
        if (typeFilter === 'all') return rawPosts
        return rawPosts.filter(post => {
            if (typeFilter === 'affiliate') return post.postType === 'affiliate'
            if (typeFilter === 'general') return post.postType === 'general' || !post.postType
            return true
        })
    }, [rawPosts, typeFilter])

    const contextValue = useMemo(
        () => ({
            posts,
            loading,
            error,
            filter,
            setFilter: handleSetFilter,
            typeFilter,
            setTypeFilter: handleSetTypeFilter,
            scrollPosition,
            setScrollPosition,
            loadingMore,
            hasMore,
            loadMore,
        }),
        [posts, loading, error, filter, handleSetFilter, typeFilter, handleSetTypeFilter, scrollPosition, loadingMore, hasMore, loadMore]
    )

    return (
        <PostsContext.Provider value={contextValue}>
            {children}
        </PostsContext.Provider>
    )
}

export function usePostsContext() {
    const context = useContext(PostsContext)
    if (context === undefined) {
        throw new Error('usePostsContext must be used within a PostsProvider')
    }
    return context
}
