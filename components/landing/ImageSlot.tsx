'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ImageIcon } from 'lucide-react'

interface ImageSlotProps {
  /** 실제 이미지 경로. 없으면 플레이스홀더가 렌더된다. */
  src?: string
  /** 접근성용 대체 텍스트 (플레이스홀더에도 aria-label로 사용) */
  alt: string
  /** 플레이스홀더 안내 라벨 */
  label?: string
  /** 종횡비 (CSS aspect-ratio). 기본 '16/9' */
  aspect?: string
  className?: string
  /** above-the-fold용 next/image priority pass-through */
  priority?: boolean
}

/**
 * 결과물 이미지 슬롯.
 * - src가 있으면 next/image로 렌더 (로드 실패 시 플레이스홀더로 폴백)
 * - src가 없으면 동일한 공간을 차지하는 플레이스홀더 렌더 → 실이미지 교체 시 레이아웃 시프트 없음
 * 실제 이미지는 추후 /public/landing/ 에 넣고 src를 지정하면 된다.
 */
export function ImageSlot({
  src,
  alt,
  label,
  aspect = '16/9',
  className = '',
  priority = false,
}: ImageSlotProps) {
  const [error, setError] = useState(false)
  const showImage = src && !error

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-border shadow-sm ${className}`}
      style={{ aspectRatio: aspect }}
      role={showImage ? undefined : 'img'}
      aria-label={showImage ? undefined : alt}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          onError={() => setError(true)}
          priority={priority}
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-dashed border-violet-300/50 dark:border-violet-700/40 rounded-2xl bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent dark:from-violet-500/10 dark:via-fuchsia-500/5 dark:to-transparent">
          <ImageIcon className="w-8 h-8 text-violet-400/60 dark:text-violet-300/40" />
          {label && (
            <span className="px-3 text-center text-sm font-medium text-muted-foreground">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
