'use client'

import { useState, useCallback, useRef } from 'react'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

interface UseImageDropZoneOptions {
  onDrop: (file: File) => void
  onError?: (message: string) => void
  maxSize?: number
}

export function useImageDropZone({ onDrop, onError, maxSize = MAX_SIZE }: UseImageDropZoneOptions) {
  const [isDragOver, setIsDragOver] = useState(false)
  const counterRef = useRef(0)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counterRef.current++
    if (counterRef.current === 1) {
      setIsDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counterRef.current--
    if (counterRef.current === 0) {
      setIsDragOver(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    counterRef.current = 0
    setIsDragOver(false)

    const file = e.dataTransfer.files?.[0]
    if (!file) return

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError?.('jpg, png, webp 형식만 지원합니다')
      return
    }

    if (file.size > maxSize) {
      onError?.('이미지 크기가 너무 큽니다 (최대 10MB)')
      return
    }

    onDrop(file)
  }, [onDrop, onError, maxSize])

  const dragProps = {
    onDragEnter: handleDragEnter,
    onDragLeave: handleDragLeave,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
  }

  return { isDragOver, dragProps }
}
