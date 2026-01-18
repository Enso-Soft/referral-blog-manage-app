'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { X, Search, Loader2, Package } from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'

interface SearchProduct {
  id: string
  name: string
  affiliateLink: string
  brand?: string
  price?: number
  images?: string[]
}

interface ProductSearchSheetProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (product: { name: string; affiliateLink: string }) => void
}

const ITEMS_PER_PAGE = 20

export function ProductSearchSheet({ isOpen, onClose, onSelect }: ProductSearchSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [lastId, setLastId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const { authFetch } = useAuthFetch()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 제품 로드 함수
  const loadProducts = useCallback(async (query: string, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
      setProducts([])
      setLastId(null)
      setPage(1)
    }
    setError(null)

    try {
      let url = '/api/products?limit=' + ITEMS_PER_PAGE

      if (query.trim()) {
        url += `&search=${encodeURIComponent(query.trim())}`
        if (isLoadMore) {
          url += `&page=${page + 1}`
        }
      } else {
        if (isLoadMore && lastId) {
          url += `&lastId=${lastId}`
        }
      }

      const res = await authFetch(url)
      const data = await res.json()

      if (data.success) {
        const newProducts = data.products || []

        if (isLoadMore) {
          setProducts(prev => [...prev, ...newProducts])
          setPage(prev => prev + 1)
        } else {
          setProducts(newProducts)
        }

        // 마지막 제품 ID 저장 (커서 기반 페이지네이션용)
        if (newProducts.length > 0) {
          setLastId(newProducts[newProducts.length - 1].id)
        }

        // 더 불러올 데이터가 있는지 확인
        setHasMore(data.hasMore || (data.pagination?.hasNextPage ?? false))
      } else {
        setError(data.error || '검색에 실패했습니다')
        if (!isLoadMore) {
          setProducts([])
        }
      }
    } catch {
      setError('검색 중 오류가 발생했습니다')
      if (!isLoadMore) {
        setProducts([])
      }
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [authFetch, lastId, page])

  // 디바운스 검색
  useEffect(() => {
    if (!isOpen) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      loadProducts(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isOpen])

  // 시트가 열릴 때 초기 목록 로드
  useEffect(() => {
    if (isOpen) {
      loadProducts('')
    } else {
      // 닫힐 때 상태 초기화
      setSearchQuery('')
      setProducts([])
      setError(null)
      setHasMore(false)
      setLastId(null)
      setPage(1)
    }
  }, [isOpen])

  // 스크롤 이벤트로 무한 스크롤 처리
  const handleScroll = useCallback(() => {
    if (!listRef.current || loading || loadingMore || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = listRef.current

    // 스크롤이 하단 100px 이내에 도달하면 추가 로드
    if (scrollHeight - scrollTop - clientHeight < 100) {
      loadProducts(searchQuery, true)
    }
  }, [loading, loadingMore, hasMore, searchQuery, loadProducts])

  useEffect(() => {
    const listElement = listRef.current
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll)
      return () => listElement.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 바깥 클릭 시 닫기
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleSelect = (product: SearchProduct) => {
    onSelect({
      name: product.name,
      affiliateLink: product.affiliateLink,
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 transition-opacity"
      onClick={handleOverlayClick}
    >
      {/* 바텀시트 */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl
                   max-h-[85vh] flex flex-col animate-slide-up"
        style={{
          animation: 'slideUp 0.3s ease-out',
        }}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            내 제품에서 추가
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 검색창 */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어 입력..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 검색 결과 목록 */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-8 text-red-500">
              {error}
            </div>
          )}

          {!loading && !error && products.length === 0 && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? '검색 결과가 없습니다' : '제품이 없습니다'}</p>
            </div>
          )}

          {!loading && products.length > 0 && (
            <div className="space-y-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelect(product)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg
                             hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                >
                  {/* 제품 이미지 */}
                  <div className="w-14 h-14 flex-shrink-0 bg-gray-100 dark:bg-gray-600 rounded-lg overflow-hidden">
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* 제품 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white truncate">
                      {product.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {product.brand && <span>{product.brand}</span>}
                      {product.brand && product.price && <span className="mx-1.5">/</span>}
                      {product.price !== undefined && product.price > 0 && (
                        <span>{formatPrice(product.price)}원</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {/* 로딩 더보기 인디케이터 */}
              {loadingMore && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              )}

              {/* 더 불러올 수 있음 표시 */}
              {!loadingMore && hasMore && (
                <div className="text-center py-2 text-sm text-gray-400">
                  스크롤하여 더 보기
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
