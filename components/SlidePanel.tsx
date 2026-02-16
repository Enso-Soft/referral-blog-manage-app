'use client'

import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
}

export function SlidePanel({ isOpen, onClose, title, icon, children }: SlidePanelProps) {
  // ESC 키 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // 모바일에서만 body 스크롤 방지
  useEffect(() => {
    if (!isOpen) return

    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => {
      document.body.style.overflow = mq.matches ? '' : 'hidden'
    }
    update()
    mq.addEventListener('change', update)
    return () => {
      document.body.style.overflow = ''
      mq.removeEventListener('change', update)
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 배경 오버레이 — 모바일만 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-50 md:hidden"
            onClick={onClose}
          />

          {/* 패널 */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="fixed top-0 right-0 h-full z-50
                       w-full md:w-[420px]
                       bg-white dark:bg-gray-900
                       border-l border-gray-200 dark:border-gray-800
                       shadow-2xl flex flex-col"
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between px-4 py-3
                            bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10
                            dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20
                            border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                {icon && (
                  <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {icon}
                  </div>
                )}
                <span className="font-semibold text-gray-900 dark:text-white text-sm">
                  {title}
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 본문 */}
            <div className="flex-1 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
