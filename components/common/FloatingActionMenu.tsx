'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Plus, Globe, AtSign } from 'lucide-react'

export type PanelType = 'ai-chat' | 'wordpress' | 'threads'

interface FloatingActionMenuProps {
  onOpenPanel: (panel: PanelType) => void
  hasThreads: boolean
}

const menuItems: Array<{
  id: PanelType
  label: string
  icon: typeof Sparkles
  requiresThreads?: boolean
}> = [
  { id: 'ai-chat', label: 'AI 콘텐츠 수정', icon: Sparkles },
  { id: 'wordpress', label: 'WordPress 발행', icon: Globe },
  { id: 'threads', label: 'Threads 발행', icon: AtSign, requiresThreads: true },
]

export function FloatingActionMenu({ onOpenPanel, hasThreads }: FloatingActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const visibleItems = menuItems.filter(
    (item) => !item.requiresThreads || hasThreads
  )

  const handleItemClick = (panel: PanelType) => {
    setIsOpen(false)
    onOpenPanel(panel)
  }

  return (
    <div ref={menuRef} className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] right-[calc(1.5rem+env(safe-area-inset-right,0px))] z-40 flex flex-col items-end gap-2">
      {/* 메뉴 항목들 */}
      <AnimatePresence>
        {isOpen && (
          <div className="flex flex-col items-end gap-2 mb-2">
            {visibleItems.map((item, i) => {
              const Icon = item.icon
              return (
                <motion.button
                  key={item.id}
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                  transition={{ delay: i * 0.05, duration: 0.15 }}
                  onClick={() => handleItemClick(item.id)}
                  className="flex items-center gap-2.5 pl-4 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap max-w-[calc(100vw-2rem)]"
                >
                  <span className="text-sm font-medium">{item.label}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </AnimatePresence>

      {/* 메인 FAB 버튼 */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? '액션 메뉴 닫기' : '액션 메뉴 열기'}
        aria-expanded={isOpen}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-xl hover:shadow-2xl flex items-center justify-center transition-shadow"
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  )
}
