'use client'

import { useRef, useEffect, useCallback } from 'react'

interface UseDragToCloseOptions {
  direction: 'x' | 'y'
  onClose: () => void
  threshold?: number
  enabled?: boolean
}

export function useDragToClose({
  direction,
  onClose,
  threshold = 100,
  enabled = true,
}: UseDragToCloseOptions) {
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)

  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  const getTargetEl = useCallback(() => {
    if (targetRef.current) return targetRef.current
    return dragHandleRef.current?.closest('[role="dialog"]') as HTMLElement | null
  }, [])

  useEffect(() => {
    if (!enabled) return
    const handle = dragHandleRef.current
    if (!handle) return

    let startPos: number | null = null
    let currentDelta = 0

    const onTouchStart = (e: TouchEvent) => {
      startPos = direction === 'y' ? e.touches[0].clientY : e.touches[0].clientX
      currentDelta = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startPos === null) return
      e.preventDefault()
      const current = direction === 'y' ? e.touches[0].clientY : e.touches[0].clientX
      const delta = Math.max(0, current - startPos)
      currentDelta = delta
      const el = getTargetEl()
      if (el) {
        el.style.transform = direction === 'y' ? `translateY(${delta}px)` : `translateX(${delta}px)`
        el.style.transition = 'none'
      }
    }

    const onTouchEnd = () => {
      const el = getTargetEl()
      if (currentDelta > threshold) {
        if (el) { el.style.transform = ''; el.style.transition = '' }
        onCloseRef.current()
      } else if (el) {
        el.style.transform = ''
        el.style.transition = ''
      }
      startPos = null
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
  }, [enabled, direction, threshold, getTargetEl])

  return { dragHandleRef, targetRef }
}
