'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Package, Loader2, X, Check, ChevronDown } from 'lucide-react'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { cn } from '@/lib/utils'

interface SearchProduct {
  id: string
  name: string
  affiliateLink: string
  brand?: string
  price?: number
  images?: string[]
}

interface SelectedProduct {
  id: string
  name: string
  affiliateLink: string
}

interface ProductComboboxProps {
  selectedProducts: SelectedProduct[]
  onSelect: (product: SelectedProduct) => void
  onRemove: (id: string) => void
  maxSelections?: number
}

export function ProductCombobox({
  selectedProducts,
  onSelect,
  onRemove,
  maxSelections = 10,
}: ProductComboboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [products, setProducts] = useState<SearchProduct[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const { authFetch } = useAuthFetch()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 제품 검색
  const searchProducts = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const url = query.trim()
        ? `/api/public/products?search=${encodeURIComponent(query.trim())}&limit=10`
        : '/api/public/products?limit=10'

      const res = await authFetch(url)
      const data = await res.json()

      if (data.success) {
        setProducts(data.products || [])
      }
    } catch (err) {
      console.error('Product search error:', err)
    } finally {
      setLoading(false)
    }
  }, [authFetch])

  // 디바운스 검색
  useEffect(() => {
    if (!isOpen) return

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(searchQuery)
    }, 300)

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, isOpen, searchProducts])

  // 드롭다운 열릴 때 초기 로드
  useEffect(() => {
    if (isOpen && products.length === 0) {
      searchProducts('')
    }
  }, [isOpen])

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault()
        setIsOpen(true)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, products.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (products[highlightedIndex]) {
          handleSelect(products[highlightedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsOpen(false)
        break
    }
  }

  // 제품 선택
  const handleSelect = (product: SearchProduct) => {
    if (selectedProducts.some(p => p.affiliateLink === product.affiliateLink)) {
      return // 이미 선택됨
    }
    if (selectedProducts.length >= maxSelections) {
      return // 최대 선택 수 초과
    }

    onSelect({
      id: product.id,
      name: product.name,
      affiliateLink: product.affiliateLink,
    })

    setSearchQuery('')
    inputRef.current?.focus()
  }

  // 선택 여부 확인
  const isSelected = (product: SearchProduct) =>
    selectedProducts.some(p => p.affiliateLink === product.affiliateLink)

  // 가격 포맷
  const formatPrice = (price: number) =>
    new Intl.NumberFormat('ko-KR').format(price)

  return (
    <div ref={containerRef} className="relative">
      {/* 선택된 제품들 */}
      {selectedProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedProducts.map((product) => (
            <motion.span
              key={product.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5
                         bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10
                         dark:from-violet-500/20 dark:to-fuchsia-500/20
                         border border-violet-200 dark:border-violet-800
                         text-violet-700 dark:text-violet-300
                         text-sm rounded-full group"
            >
              <span className="max-w-[150px] truncate">
                {product.name}
              </span>
              <button
                onClick={() => onRemove(product.id)}
                className="p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800
                           transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.span>
          ))}
        </div>
      )}

      {/* 검색 입력 */}
      <div
        className={cn(
          'relative flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all cursor-text',
          isOpen
            ? 'border-violet-400 dark:border-violet-600 ring-2 ring-violet-500/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500',
          'bg-white dark:bg-gray-800'
        )}
        onClick={() => {
          setIsOpen(true)
          inputRef.current?.focus()
        }}
      >
        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedProducts.length >= maxSelections
              ? `최대 ${maxSelections}개까지 선택 가능`
              : '제품 검색...'
          }
          disabled={selectedProducts.length >= maxSelections}
          className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white
                     placeholder:text-gray-400 dark:placeholder:text-gray-500
                     focus:outline-none disabled:cursor-not-allowed"
        />
        {loading ? (
          <Loader2 className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" />
        ) : (
          <ChevronDown
            className={cn(
              'w-4 h-4 text-gray-400 flex-shrink-0 transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        )}
      </div>

      {/* 드롭다운 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 left-0 right-0 mt-2
                       bg-white dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700
                       rounded-xl shadow-xl overflow-hidden"
          >
            <div
              ref={listRef}
              className="max-h-64 overflow-y-auto"
            >
              {loading && products.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                  <Package className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-sm">
                    {searchQuery ? '검색 결과가 없습니다' : '제품이 없습니다'}
                  </span>
                </div>
              ) : (
                <div className="py-1">
                  {products.map((product, index) => {
                    const selected = isSelected(product)
                    return (
                      <button
                        key={product.id}
                        onClick={() => handleSelect(product)}
                        onMouseEnter={() => setHighlightedIndex(index)}
                        disabled={selected}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          highlightedIndex === index && !selected
                            ? 'bg-violet-50 dark:bg-violet-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50',
                          selected && 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                        )}
                      >
                        {/* 제품 이미지 */}
                        <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden
                                        bg-gray-100 dark:bg-gray-700">
                          {product.images && product.images.length > 0 ? (
                            <img
                              src={product.images[0]}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* 제품 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {product.name}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {product.brand && <span>{product.brand}</span>}
                            {product.brand && product.price && <span>·</span>}
                            {product.price !== undefined && product.price > 0 && (
                              <span>{formatPrice(product.price)}원</span>
                            )}
                          </div>
                        </div>

                        {/* 선택 표시 */}
                        {selected && (
                          <div className="flex-shrink-0 w-5 h-5 rounded-full
                                          bg-violet-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 하단 힌트 */}
            <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">↑↓</kbd>
                {' '}이동{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Enter</kbd>
                {' '}선택{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-[10px]">Esc</kbd>
                {' '}닫기
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
