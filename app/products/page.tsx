'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ProductCard } from '@/components/ProductCard'
import { AuthGuard } from '@/components/AuthGuard'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { Loader2, AlertCircle, Package, Search, X } from 'lucide-react'

interface Product {
  id: string
  name: string
  affiliateLink: string
  price?: number
  brand?: string
  mall?: string
  images?: string[]
  nameKeywords?: string[]
  category?: {
    level1: string
    level2: string
    level3?: string
  }
}

interface CategoryStat {
  name: string
  count: number
}

const ITEMS_PER_PAGE = 20

function ProductList() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState<number | null>(null)
  const [categoryStats, setCategoryStats] = useState<CategoryStat[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const { authFetch } = useAuthFetch()
  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const fetchProducts = useCallback(
    async (lastId?: string, category?: string, search?: string) => {
      if (lastId) {
        setLoadingMore(true)
      } else {
        setLoading(true)
        setProducts([])
      }
      setError(null)

      try {
        let url = `/api/public/products?limit=${ITEMS_PER_PAGE}`
        if (lastId) {
          url += `&lastId=${lastId}`
        }
        if (search) {
          url += `&search=${encodeURIComponent(search)}`
        } else if (category && category !== 'all') {
          url += `&category=${encodeURIComponent(category)}`
        }

        const res = await authFetch(url)
        const data = await res.json()

        if (data.success) {
          if (lastId) {
            setProducts((prev) => [...prev, ...data.products])
          } else {
            setProducts(data.products)
            // 첫 로드 시에만 전체 개수와 카테고리 통계 저장 (category가 'all'이거나 없을 때)
            if (data.total !== undefined && (!category || category === 'all')) {
              setTotal(data.total)
            }
            if (data.categoryStats && (!category || category === 'all')) {
              setCategoryStats(data.categoryStats)
            }
          }
          setHasMore(data.hasMore)
        } else {
          setError(data.error || '제품 목록을 불러올 수 없습니다')
        }
      } catch (err) {
        setError('제품 목록을 불러오는 중 오류가 발생했습니다')
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [authFetch]
  )

  // 검색어 디바운스
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // 초기 로드 및 카테고리/검색어 변경 시 로드
  useEffect(() => {
    fetchProducts(undefined, categoryFilter, debouncedSearch || undefined)
  }, [categoryFilter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // 무한 스크롤
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const lastProduct = products[products.length - 1]
          if (lastProduct) {
            fetchProducts(lastProduct.id, categoryFilter, debouncedSearch || undefined)
          }
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current)
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [loading, loadingMore, hasMore, products, categoryFilter, debouncedSearch]) // eslint-disable-line react-hooks/exhaustive-deps

  // 서버에서 검색/필터링된 결과 사용
  const filteredProducts = products

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">제휴 제품 목록</h1>
        <p className="text-muted-foreground mt-1">
          나에게 할당된 제휴 제품을 확인하고 링크를 복사합니다
          {total !== null && (
            <span className="ml-2 text-muted-foreground/80">
              (총 {total.toLocaleString()}개)
            </span>
          )}
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="제품명, 브랜드, 스토어 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder:text-muted-foreground"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        {debouncedSearch && (
          <p className="mt-2 text-sm text-muted-foreground">
            &quot;{debouncedSearch}&quot; 검색 결과: {filteredProducts.length}개
          </p>
        )}
      </div>

      {/* Category Filter */}
      {categoryStats.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${categoryFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border'
              }`}
          >
            전체 ({total?.toLocaleString() || 0})
          </button>
          {categoryStats.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setCategoryFilter(cat.name)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${categoryFilter === cat.name
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-border'
                }`}
            >
              {cat.name} ({cat.count.toLocaleString()})
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">로딩 중...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center py-12 text-red-500">
          <AlertCircle className="w-6 h-6 mr-2" />
          <span>{error}</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Package className="w-12 h-12 mb-3" />
          <p>
            {debouncedSearch
              ? '검색 결과가 없습니다'
              : categoryFilter === 'all'
                ? '할당된 제품이 없습니다'
                : '해당 카테고리에 제품이 없습니다'}
          </p>
          {!debouncedSearch && categoryFilter === 'all' && (
            <p className="text-sm mt-1">관리자에게 제품 할당을 요청하세요</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Load More Trigger */}
          <div ref={loadMoreRef} className="py-8 flex justify-center">
            {loadingMore && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>더 불러오는 중...</span>
              </div>
            )}
            {!hasMore && products.length > 0 && !debouncedSearch && (
              <p className="text-muted-foreground text-sm">
                모든 제품을 불러왔습니다 ({products.length}개)
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProductsPage() {
  return (
    <AuthGuard>
      <ProductList />
    </AuthGuard>
  )
}
