'use client'

import { ExternalLink, Store, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

interface Product {
  id: string
  name: string
  affiliateLink: string
  finalUrl?: string
  price?: number
  brand?: string
  mall?: string
  images?: string[]
  category?: {
    level1: string
    level2: string
    level3?: string
  }
}

function detectPlatform(affiliateLink: string, finalUrl?: string): 'coupang' | 'naver' | null {
  const urls = [affiliateLink, finalUrl].filter(Boolean).join(' ').toLowerCase()
  if (urls.includes('coupang')) return 'coupang'
  if (urls.includes('naver')) return 'naver'
  return null
}

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [copied, setCopied] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const images = product.images || []
  const hasMultipleImages = images.length > 1
  const platform = detectPlatform(product.affiliateLink, product.finalUrl)

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(product.affiliateLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ko-KR').format(price) + '원'
  }

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="bg-card dark:bg-slate-800 rounded-xl border border-border dark:border-slate-700 overflow-hidden hover:shadow-lg hover:border-indigo-500/50 transition-all duration-300 flex flex-col">
      {/* Thumbnail with Slider */}
      <div className="h-60 bg-secondary/50 relative group flex-shrink-0">
        {images.length > 0 ? (
          <img
            src={images[currentImageIndex]}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Store className="w-16 h-16" />
          </div>
        )}

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <button
              onClick={handlePrevImage}
              className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleNextImage}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image Indicators */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setCurrentImageIndex(idx)
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        )}

        {/* Category + Platform Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {product.category && (
            <span className="px-2 py-1 text-xs bg-black/60 text-white rounded-full">
              {product.category.level2}
            </span>
          )}
          {platform === 'coupang' && (
            <span className="px-2 py-1 text-xs font-medium bg-[#E6282D] text-white rounded-full">
              쿠팡
            </span>
          )}
          {platform === 'naver' && (
            <span className="px-2 py-1 text-xs font-medium bg-[#03C75A] text-white rounded-full">
              네이버
            </span>
          )}
        </div>

        {/* Image Count Badge */}
        {hasMultipleImages && (
          <div className="absolute top-2 right-2">
            <span className="px-2 py-1 text-xs bg-black/60 text-white rounded-full">
              {currentImageIndex + 1}/{images.length}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1">
        {/* Brand */}
        {product.brand && (
          <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
        )}

        {/* Name */}
        <h3 className="font-medium text-foreground line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Price */}
        {product.price && (
          <p className="text-lg font-bold text-foreground mb-3">
            {formatPrice(product.price)}
          </p>
        )}

        {/* Mall */}
        {product.mall && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Store className="w-3 h-3" />
            <span>{product.mall}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-3">
          <a
            href={product.affiliateLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              platform === 'coupang'
                ? 'bg-[#E6282D] hover:bg-[#C42025]'
                : platform === 'naver'
                  ? 'bg-[#03C75A] hover:bg-[#02B050]'
                  : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            제품 보기
          </a>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center px-3 py-2 text-sm font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
            title="링크 복사"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
