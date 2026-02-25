'use client'

import { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef, ReactNode } from 'react'
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    getDocs,
    startAfter,
    type Query,
    type DocumentData,
    type QueryConstraint,
    type DocumentSnapshot,
} from 'firebase/firestore'
import { getFirebaseDb } from '@/lib/firebase'
import { useAuth } from '@/components/layout/AuthProvider'
import type { BlogPost } from '@/lib/firestore'
import { BlogPostSchema } from '@/lib/schemas/post'

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
    removePost: (postId: string) => void
    updatePost: (postId: string, partial: Partial<BlogPost>) => void
    loadingMore: boolean
    hasMore: boolean
    loadMore: () => void
}

const PostsContext = createContext<PostsContextType | undefined>(undefined)

export function PostsProvider({ children }: { children: ReactNode }) {
    const { user, isAdmin, loading: authLoading } = useAuth()
    // rawPosts: onSnapshot 1페이지 데이터
    const [rawPosts, setRawPosts] = useState<BlogPost[]>([])
    // extraPosts: getDocs로 가져온 2페이지 이후 데이터 누적
    const [extraPosts, setExtraPosts] = useState<BlogPost[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Pagination state
    const [loadingMore, setLoadingMore] = useState(false)
    const [hasMore, setHasMore] = useState(false)

    // 커서: startAfter에 사용할 마지막 문서 스냅샷
    const cursorRef = useRef<DocumentSnapshot<DocumentData> | null>(null)
    // extraPosts 로드 여부 (onSnapshot이 커서를 덮어쓰지 않도록 보호)
    const hasLoadedExtraRef = useRef(false)
    // loadMore 동시 호출 방어 (React state는 동기 업데이트 안 됨)
    const loadingMoreRef = useRef(false)

    // Persistent state
    const [filter, setFilter] = useState<StatusFilter>('all')
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

    // 필터 변경 시 모든 추가 페이지 데이터 초기화
    const resetExtra = useCallback(() => {
        setExtraPosts([])
        cursorRef.current = null
        hasLoadedExtraRef.current = false
    }, [])

    const handleSetFilter = useCallback((newFilter: StatusFilter) => {
        if (newFilter === filter) return
        setFilter(newFilter)
        resetExtra()
        setRawPosts([])
        setLoading(true)
    }, [filter, resetExtra])

    const handleSetTypeFilter = useCallback((newFilter: TypeFilter) => {
        if (newFilter === typeFilter) return
        setTypeFilter(newFilter)
        resetExtra()
        setRawPosts([])
        setLoading(true)
    }, [typeFilter, resetExtra])

    // 쿼리 제약 조건 빌더 (onSnapshot, getDocs 공용)
    const buildConstraints = useCallback((): QueryConstraint[] => {
        const constraints: QueryConstraint[] = []
        if (!isAdmin && user) {
            constraints.push(where('userId', '==', user.uid))
        }
        if (filter !== 'all') {
            constraints.push(where('status', '==', filter))
        }
        if (typeFilter !== 'all') {
            constraints.push(where('postType', '==', typeFilter))
        }
        constraints.push(orderBy('createdAt', 'desc'))
        return constraints
    }, [user, isAdmin, filter, typeFilter])

    // loadMore: 2페이지 이후 getDocs로 추가 데이터 가져오기
    const loadMore = useCallback(async () => {
        if (loadingMoreRef.current || !hasMore || !cursorRef.current) return
        loadingMoreRef.current = true
        setLoadingMore(true)

        try {
            const db = getFirebaseDb()
            const postsRef = collection(db, 'blog_posts')
            const constraints = buildConstraints()

            const q = query(
                postsRef,
                ...constraints,
                startAfter(cursorRef.current),
                limit(PAGE_SIZE)
            ) as Query<DocumentData>

            const snapshot = await getDocs(q)
            const newPosts = snapshot.docs.map((doc) => {
                const data = { id: doc.id, ...doc.data() }
                if (process.env.NODE_ENV === 'development') {
                    const result = BlogPostSchema.safeParse(data)
                    if (!result.success) {
                        console.warn(`[PostsProvider] BlogPost validation failed for doc ${doc.id}:`, result.error.flatten().fieldErrors)
                    }
                }
                return data
            }) as BlogPost[]

            if (snapshot.docs.length > 0) {
                cursorRef.current = snapshot.docs[snapshot.docs.length - 1]
                hasLoadedExtraRef.current = true
            }

            setExtraPosts(prev => [...prev, ...newPosts])
            setHasMore(snapshot.docs.length >= PAGE_SIZE)
        } catch (err) {
            console.error('Failed to load more posts:', err)
        } finally {
            loadingMoreRef.current = false
            setLoadingMore(false)
        }
    }, [hasMore, buildConstraints])

    // Firestore 구독 (1페이지만 — filter, typeFilter 의존성)
    useEffect(() => {
        if (authLoading) return

        if (!user) {
            setRawPosts([])
            setExtraPosts([])
            cursorRef.current = null
            hasLoadedExtraRef.current = false
            setHasMore(false)
            setLoading(false)
            setError('로그인이 필요합니다')
            return
        }

        setError(null)

        try {
            const db = getFirebaseDb()
            const postsRef = collection(db, 'blog_posts')
            const constraints = buildConstraints()

            const q = query(postsRef, ...constraints, limit(PAGE_SIZE)) as Query<DocumentData>

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const posts = snapshot.docs.map((doc) => {
                        const data = { id: doc.id, ...doc.data() }
                        if (process.env.NODE_ENV === 'development') {
                            const result = BlogPostSchema.safeParse(data)
                            if (!result.success) {
                                console.warn(`[PostsProvider] BlogPost validation failed for doc ${doc.id}:`, result.error.flatten().fieldErrors)
                            }
                        }
                        return data
                    }) as BlogPost[]
                    setRawPosts(posts)

                    // hasMore·커서 업데이트: extraPosts 로드 전에만 (추가 로드 후에는 보존)
                    if (!hasLoadedExtraRef.current) {
                        setHasMore(snapshot.docs.length >= PAGE_SIZE)
                        if (snapshot.docs.length > 0) {
                            cursorRef.current = snapshot.docs[snapshot.docs.length - 1]
                        }
                    }

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
            setLoadingMore(false)
        }
    }, [user?.uid, isAdmin, authLoading, filter, typeFilter, buildConstraints])

    // 글 필드 변경 시 로컬 상태 즉시 반영 (rawPosts + extraPosts)
    const updatePost = useCallback((postId: string, partial: Partial<BlogPost>) => {
        const apply = (posts: BlogPost[]) =>
            posts.map(p => p.id === postId ? { ...p, ...partial } : p)
        setRawPosts(prev => apply(prev))
        setExtraPosts(prev => apply(prev))
    }, [])

    // 글 삭제 시 로컬 상태에서 즉시 제거 (optimistic removal) + 빈자리 보충
    const removePost = useCallback((postId: string) => {
        setRawPosts(prev => prev.filter(p => p.id !== postId))
        setExtraPosts(prev => prev.filter(p => p.id !== postId))

        // 추가 페이지가 로드된 상태이고 커서가 있으면, 1개를 보충 fetch
        if (hasLoadedExtraRef.current && cursorRef.current) {
            const db = getFirebaseDb()
            const postsRef = collection(db, 'blog_posts')
            const constraints = buildConstraints()
            const q = query(
                postsRef,
                ...constraints,
                startAfter(cursorRef.current),
                limit(1)
            )
            getDocs(q).then((snapshot) => {
                if (snapshot.docs.length > 0) {
                    const doc = snapshot.docs[0]
                    const newPost = { id: doc.id, ...doc.data() } as BlogPost
                    cursorRef.current = doc
                    setExtraPosts(prev => [...prev, newPost])
                } else {
                    setHasMore(false)
                }
            }).catch((err) => {
                console.error('Failed to fill after remove:', err)
            })
        }
    }, [buildConstraints])

    // 최종 posts: rawPosts + extraPosts (ID 기반 중복 제거, extraPosts 내부 중복 포함)
    const posts = useMemo(() => {
        if (extraPosts.length === 0) return rawPosts

        const seenIds = new Set(rawPosts.map(p => p.id))
        const dedupedExtra: BlogPost[] = []
        for (const p of extraPosts) {
            if (!seenIds.has(p.id)) {
                seenIds.add(p.id)  // extraPosts 내부 중복도 방어
                dedupedExtra.push(p)
            }
        }
        return [...rawPosts, ...dedupedExtra]
    }, [rawPosts, extraPosts])

    const contextValue = useMemo(
        () => ({
            posts,
            loading,
            error,
            filter,
            setFilter: handleSetFilter,
            typeFilter,
            setTypeFilter: handleSetTypeFilter,
            removePost,
            updatePost,
            loadingMore,
            hasMore,
            loadMore,
        }),
        [posts, loading, error, filter, handleSetFilter, typeFilter, handleSetTypeFilter, removePost, updatePost, loadingMore, hasMore, loadMore]
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
