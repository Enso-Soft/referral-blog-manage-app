'use client'

import { useState } from 'react'
import { Download, Images, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { downloadImage, downloadAllImages, createComparisonImage } from '@/lib/utils'
import { BeforeAfterSlider } from './BeforeAfterSlider'

interface HairstyleResultGalleryProps {
  faceImageUrl: string
  resultImageUrls: string[]
}

export function HairstyleResultGallery({
  faceImageUrl,
  resultImageUrls,
}: HairstyleResultGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isDownloadingAll, setIsDownloadingAll] = useState(false)
  const [isDownloadingComparison, setIsDownloadingComparison] = useState(false)

  const currentResult = resultImageUrls[activeIndex]

  const handleDownloadSingle = async () => {
    if (!currentResult) return
    await downloadImage(currentResult, `hairstyle_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}_${activeIndex + 1}.webp`)
  }

  const handleDownloadAll = async () => {
    setIsDownloadingAll(true)
    try {
      await downloadAllImages(resultImageUrls)
    } finally {
      setIsDownloadingAll(false)
    }
  }

  const handleDownloadComparison = async () => {
    if (!currentResult) return
    setIsDownloadingComparison(true)
    try {
      await createComparisonImage(faceImageUrl, currentResult)
    } finally {
      setIsDownloadingComparison(false)
    }
  }

  return (
      <div className="space-y-4">
        {/* BeforeAfterSlider */}
        {currentResult && (
          <BeforeAfterSlider
            beforeImage={faceImageUrl}
            afterImage={currentResult}
            className="max-w-md mx-auto"
          />
        )}

        {/* 다중 결과 썸네일 */}
        {resultImageUrls.length > 1 && (
          <div className="flex items-center justify-center gap-2">
            {resultImageUrls.map((url, i) => (
              <button
                key={i}
                onClick={() => setActiveIndex(i)}
                className={cn(
                  'w-14 h-14 rounded-lg overflow-hidden border-2 transition-all',
                  i === activeIndex
                    ? 'border-violet-500 ring-2 ring-violet-500/30 scale-105'
                    : 'border-gray-200 dark:border-gray-700 opacity-60 hover:opacity-100'
                )}
              >
                <img src={url} alt={`결과 ${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* 다운로드 툴바 */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadSingle}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            다운로드
          </Button>
          {resultImageUrls.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadAll}
              disabled={isDownloadingAll}
              className="gap-1.5 text-xs"
            >
              <Images className="w-3.5 h-3.5" />
              전체 다운로드
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadComparison}
            disabled={isDownloadingComparison}
            className="gap-1.5 text-xs"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            비교 이미지
          </Button>
        </div>
      </div>
  )
}
