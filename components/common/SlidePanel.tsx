'use client'

import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'

interface SlidePanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: ReactNode
  children: ReactNode
}

export function SlidePanel({ isOpen, onClose, title, icon, children }: SlidePanelProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) onClose() }} modal={false}>
      <SheetContent
        side="right"
        showCloseButton={false}
        showOverlay={false}
        onInteractOutside={(e) => e.preventDefault()}
        className="w-full md:w-[420px] sm:max-w-[420px] p-0 gap-0 flex flex-col"
      >
        {/* 헤더 */}
        <SheetHeader className="px-4 py-3 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:via-purple-500/20 dark:to-fuchsia-500/20 border-b border-gray-200 dark:border-gray-800 flex-row items-center justify-between gap-0 space-y-0">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                {icon}
              </div>
            )}
            <SheetTitle className="text-sm">
              {title}
            </SheetTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </Button>
          <SheetDescription className="sr-only">{title} 패널</SheetDescription>
        </SheetHeader>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </SheetContent>
    </Sheet>
  )
}
