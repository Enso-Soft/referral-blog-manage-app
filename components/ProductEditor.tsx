'use client'

import { useState } from 'react'
import { Plus, Trash2, Search, ExternalLink } from 'lucide-react'
import { Product } from '@/lib/firestore'
import { ProductSearchSheet } from './ProductSearchSheet'

interface ProductEditorProps {
  products: Product[]
  onChange: (products: Product[]) => void
}

export function ProductEditor({ products, onChange }: ProductEditorProps) {
  const [name, setName] = useState('')
  const [affiliateLink, setAffiliateLink] = useState('')
  const [isSearchSheetOpen, setIsSearchSheetOpen] = useState(false)

  const handleAdd = () => {
    if (!name.trim() || !affiliateLink.trim()) return

    const newProduct: Product = {
      name: name.trim(),
      affiliateLink: affiliateLink.trim(),
    }

    onChange([...products, newProduct])
    setName('')
    setAffiliateLink('')
  }

  const handleRemove = (index: number) => {
    onChange(products.filter((_, i) => i !== index))
  }

  const handleSelectFromSearch = (product: { name: string; affiliateLink: string }) => {
    const newProduct: Product = {
      name: product.name,
      affiliateLink: product.affiliateLink,
    }
    onChange([...products, newProduct])
    setIsSearchSheetOpen(false)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        제품 목록
      </h3>

      {/* 현재 추가된 제품 목록 */}
      {products.length > 0 && (
        <div className="space-y-2 mb-4">
          {products.map((product, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">
                  {product.name}
                </div>
                <a
                  href={product.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                >
                  <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{product.affiliateLink}</span>
                </a>
              </div>
              <button
                onClick={() => handleRemove(index)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                aria-label="제품 삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {products.length === 0 && (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400 mb-4">
          추가된 제품이 없습니다
        </div>
      )}

      {/* 직접 입력 폼 */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="제품명"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="text"
            value={affiliateLink}
            onChange={(e) => setAffiliateLink(e.target.value)}
            placeholder="제휴 링크"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !affiliateLink.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2
                     bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600
                     text-white rounded-lg transition-colors disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          추가
        </button>
      </div>

      {/* 내 제품에서 추가 버튼 */}
      <button
        onClick={() => setIsSearchSheetOpen(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-3
                   border-2 border-dashed border-gray-300 dark:border-gray-600
                   hover:border-blue-500 dark:hover:border-blue-400
                   text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400
                   rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        내 제품에서 추가
      </button>

      {/* 검색 바텀시트 */}
      <ProductSearchSheet
        isOpen={isSearchSheetOpen}
        onClose={() => setIsSearchSheetOpen(false)}
        onSelect={handleSelectFromSearch}
      />
    </div>
  )
}
