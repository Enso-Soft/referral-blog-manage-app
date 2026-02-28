'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadImage } from '@/lib/utils'

interface HairstyleResultGalleryProps {
  faceImageUrl: string
  resultImageUrls: string[]
}

export function HairstyleResultGallery({
  faceImageUrl,
  resultImageUrls,
}: HairstyleResultGalleryProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  return (
    <>
      <div className="space-y-4">
        {resultImageUrls.map((resultUrl, index) => (
          <div key={index} className="flex items-center gap-3 sm:gap-4">
            {/* 원본 얼굴 (첫 번째만 표시) */}
            {index === 0 && (
              <div className="flex-shrink-0">
                <img
                  src={faceImageUrl}
                  alt="원본"
                  className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setLightboxUrl(faceImageUrl)}
                />
                <p className="text-xs text-center text-muted-foreground mt-1">원본</p>
              </div>
            )}

            {/* 화살표 */}
            {index === 0 && (
              <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground flex-shrink-0" />
            )}

            {/* 결과 이미지 */}
            <div className="flex-shrink-0 relative group">
              <img
                src={resultUrl}
                alt={`결과 ${index + 1}`}
                className="w-28 h-28 sm:w-36 sm:h-36 object-cover rounded-xl border-2 border-violet-300 dark:border-violet-600 cursor-pointer hover:opacity-90 transition-opacity shadow-lg"
                onClick={() => setLightboxUrl(resultUrl)}
              />
              <p className="text-xs text-center text-violet-600 dark:text-violet-400 font-medium mt-1">결과</p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => downloadImage(resultUrl, `hairstyle-${Date.now()}.webp`)}
                className="absolute top-1 right-1 bg-black/50 hover:bg-black/70 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.img
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              src={lightboxUrl}
              alt="확대 보기"
              className="max-w-full max-h-[85vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLightboxUrl(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                downloadImage(lightboxUrl, `hairstyle-${Date.now()}.webp`)
              }}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white rounded-xl gap-2"
            >
              <Download className="w-4 h-4" />
              다운로드
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
