'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  X,
  ImageIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// 이미지 갤러리 (썸네일 + 전체화면 뷰어)
export function ImageGallery({ images }: { images: string[] }) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  return (
    <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-1.5 mb-2">
        <ImageIcon className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        <p className="text-xs text-gray-500 dark:text-gray-400">
          첨부 이미지 ({images.length})
        </p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {images.map((src, i) => (
          <button
            key={i}
            onClick={() => setViewerIndex(i)}
            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-500 hover:scale-105 active:scale-95 transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`첨부 이미지 ${i + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>
      <FullscreenImageViewer
        images={images}
        currentIndex={viewerIndex}
        onClose={() => setViewerIndex(null)}
        onNavigate={setViewerIndex}
      />
    </div>
  )
}

// 전체화면 이미지 뷰어
export function FullscreenImageViewer({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: {
  images: string[]
  currentIndex: number | null
  onClose: () => void
  onNavigate: (index: number) => void
}) {
  const [mounted, setMounted] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const [direction, setDirection] = useState(0)
  const dragRef = useRef<{ startX: number; startY: number } | null>(null)

  useEffect(() => { setMounted(true) }, [])

  // 줌 상태 초기화 (이미지 전환 시)
  useEffect(() => { setZoomed(false) }, [currentIndex])

  // 키보드 네비게이션
  useEffect(() => {
    if (currentIndex === null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setDirection(-1)
        onNavigate(currentIndex - 1)
      }
      if (e.key === 'ArrowRight' && currentIndex < images.length - 1) {
        setDirection(1)
        onNavigate(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentIndex, images.length, onClose, onNavigate])

  const goTo = useCallback((index: number) => {
    if (currentIndex === null) return
    setDirection(index > currentIndex ? 1 : -1)
    onNavigate(index)
  }, [currentIndex, onNavigate])

  if (!mounted || currentIndex === null) return null

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -300 : 300, opacity: 0 }),
  }

  return createPortal(
    <AnimatePresence>
      {currentIndex !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex flex-col bg-black"
          onClick={onClose}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 z-10"
               onClick={(e) => e.stopPropagation()}>
            <span className="text-sm text-white/70 font-medium">
              {currentIndex + 1} / {images.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setZoomed(z => !z)}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                {zoomed ? <ZoomOut className="w-5 h-5" /> : <ZoomIn className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Image area */}
          <div className="flex-1 relative flex items-center justify-center overflow-hidden min-h-0"
               onClick={(e) => e.stopPropagation()}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                drag={!zoomed ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragStart={(_, info) => {
                  dragRef.current = { startX: info.point.x, startY: info.point.y }
                }}
                onDragEnd={(_, info) => {
                  const threshold = 50
                  if (info.offset.x < -threshold && currentIndex < images.length - 1) {
                    setDirection(1)
                    onNavigate(currentIndex + 1)
                  } else if (info.offset.x > threshold && currentIndex > 0) {
                    setDirection(-1)
                    onNavigate(currentIndex - 1)
                  }
                }}
                className="absolute inset-0 flex items-center justify-center p-4"
                onClick={() => setZoomed(z => !z)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <motion.img
                  src={images[currentIndex]}
                  alt={`이미지 ${currentIndex + 1}`}
                  animate={{ scale: zoomed ? 2 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                  className={cn(
                    'max-w-full max-h-full object-contain rounded-lg select-none',
                    zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  )}
                  draggable={false}
                />
              </motion.div>
            </AnimatePresence>

            {/* Nav arrows */}
            {currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex - 1) }}
                className="absolute left-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white backdrop-blur-sm hover:scale-110 active:scale-95 z-10"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}
            {currentIndex < images.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => { e.stopPropagation(); goTo(currentIndex + 1) }}
                className="absolute right-3 rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white backdrop-blur-sm hover:scale-110 active:scale-95 z-10"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}
          </div>

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div className="flex justify-center gap-2 px-4 py-3 z-10"
                 onClick={(e) => e.stopPropagation()}>
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={cn(
                    'w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0',
                    i === currentIndex
                      ? 'border-white scale-110 shadow-lg shadow-white/20'
                      : 'border-transparent opacity-50 hover:opacity-80 hover:border-white/30'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
