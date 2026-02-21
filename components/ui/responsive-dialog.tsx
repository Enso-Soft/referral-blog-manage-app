"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const dragHandleRef = React.useRef<HTMLDivElement>(null)

  // 드래그 닫기 — native addEventListener + passive:false
  React.useEffect(() => {
    const handle = dragHandleRef.current
    if (!handle) return

    let startY: number | null = null
    let currentDelta = 0

    const getDialogEl = () =>
      handle.closest('[role="dialog"]') as HTMLElement | null

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      currentDelta = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return
      e.preventDefault()
      const delta = Math.max(0, e.touches[0].clientY - startY)
      currentDelta = delta
      const el = getDialogEl()
      if (el) {
        el.style.transform = `translateY(${delta}px)`
        el.style.transition = 'none'
      }
    }

    const onTouchEnd = () => {
      const el = getDialogEl()
      if (currentDelta > 100) {
        if (el) { el.style.transform = ''; el.style.transition = '' }
        closeRef.current?.click()
      } else if (el) {
        el.style.transform = ''
        el.style.transition = ''
      }
      startY = null
      currentDelta = 0
    }

    handle.addEventListener('touchstart', onTouchStart, { passive: true })
    handle.addEventListener('touchmove', onTouchMove, { passive: false })
    handle.addEventListener('touchend', onTouchEnd)

    return () => {
      handle.removeEventListener('touchstart', onTouchStart)
      handle.removeEventListener('touchmove', onTouchMove)
      handle.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "bg-background outline-none shadow-xl",
          "fixed z-50 w-full",
          // Mobile: 바텀시트
          "inset-x-0 bottom-0",
          "rounded-t-2xl border-t border-x",
          "max-h-[85vh] overflow-y-auto",
          // Desktop: 중앙 팝업
          "sm:inset-x-auto sm:bottom-auto",
          "sm:top-[50%] sm:left-[50%]",
          "sm:translate-x-[-50%] sm:translate-y-[-50%]",
          "sm:w-full sm:max-w-[calc(100%-2rem)] sm:max-w-lg",
          "sm:max-h-none sm:overflow-visible",
          "sm:rounded-xl sm:border",
          // Mobile 애니메이션
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          "duration-300",
          // Desktop 애니메이션
          "sm:data-[state=open]:slide-in-from-bottom-[0%]",
          "sm:data-[state=closed]:slide-out-to-bottom-[0%]",
          "sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          "sm:duration-200",
          className
        )}
        {...props}
      >
        {/* 드래그 핸들 — 모바일에서만 표시, 넓은 터치 영역 */}
        <div
          ref={dragHandleRef}
          className="sm:hidden flex justify-center py-3 cursor-grab active:cursor-grabbing"
        >
          <div className="w-10 h-1 bg-muted rounded-full" />
        </div>

        <div className="grid gap-4 p-6 pt-2 pb-[calc(1.5rem_+_env(safe-area-inset-bottom,_0px))] sm:pt-6 sm:pb-6">
          {children}
        </div>

        {showCloseButton && (
          <DialogPrimitive.Close className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}

        {/* 드래그 임계값 초과 시 닫기용 숨김 버튼 */}
        <DialogPrimitive.Close ref={closeRef} className="sr-only" tabIndex={-1} aria-hidden />
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
