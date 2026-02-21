'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Check, FileText, AlertTriangle } from 'lucide-react'

interface CopyButtonProps {
  content: string
  className?: string
}

export function CopyButton({ content, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [content])

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'bg-background text-foreground border border-border dark:border-gray-600 hover:bg-secondary/50 shadow-sm'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-4 h-4" />
          복사됨!
        </>
      ) : (
        <>
          <Copy className="w-4 h-4" />
          HTML 복사
        </>
      )}
    </button>
  )
}

// 스타일된 박스 안의 링크 → URL 텍스트만 남김
function simplifyStyledLinks(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')

  doc.querySelectorAll('a[href]').forEach((link) => {
    const style = link.getAttribute('style') || ''
    const hasButtonStyle =
      style.includes('background') ||
      style.includes('border-radius') ||
      style.includes('padding')
    if (!hasButtonStyle) return

    const url = link.getAttribute('href') || ''
    const plainLink = document.createElement('a')
    plainLink.href = url
    plainLink.textContent = url
    plainLink.style.fontSize = '20px'

    const parent = link.parentElement
    if (
      parent &&
      parent.tagName === 'DIV' &&
      parent.children.length === 1 &&
      (parent.textContent || '').trim() === (link.textContent || '').trim()
    ) {
      parent.replaceWith(plainLink)
    } else {
      link.replaceWith(plainLink)
    }
  })

  return doc.body.innerHTML
}

export function RichCopyButton({ content, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const mobileSheetRef = useRef<HTMLDivElement>(null)
  const desktopPopoverRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 바깥 클릭 시 닫기
  useEffect(() => {
    if (!showConfirm) return
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (btnRef.current?.contains(target)) return
      if (mobileSheetRef.current?.contains(target)) return
      if (desktopPopoverRef.current?.contains(target)) return
      setShowConfirm(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [showConfirm])

  // 드래그 닫기 — native addEventListener + passive:false 로 등록해야 동작함
  useEffect(() => {
    if (!showConfirm) return
    const handle = dragHandleRef.current
    const sheet = mobileSheetRef.current
    if (!handle || !sheet) return

    let startY: number | null = null
    let currentDelta = 0

    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY
      currentDelta = 0
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startY === null) return
      e.preventDefault() // passive:false 이기 때문에 가능 — 브라우저 스크롤 차단
      const delta = Math.max(0, e.touches[0].clientY - startY)
      currentDelta = delta
      sheet.style.transform = `translateY(${delta}px)`
      sheet.style.transition = 'none'
    }

    const onTouchEnd = () => {
      if (currentDelta > 100) {
        setShowConfirm(false)
      } else {
        sheet.style.transform = ''
        sheet.style.transition = ''
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
  }, [showConfirm])

  const handleRichCopy = useCallback(async () => {
    setShowConfirm(false)
    try {
      const simplified = simplifyStyledLinks(content)
      const tmp = document.createElement('div')
      tmp.innerHTML = simplified

      if (typeof ClipboardItem !== 'undefined') {
        const htmlBlob = new Blob([simplified], { type: 'text/html' })
        const textBlob = new Blob([tmp.textContent || ''], { type: 'text/plain' })
        await navigator.clipboard.write([
          new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob }),
        ])
      } else {
        await navigator.clipboard.writeText(tmp.textContent || '')
      }

      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to rich copy:', err)
    }
  }, [content])

  const getPopoverStyle = (): React.CSSProperties => {
    if (!btnRef.current) return {}
    const rect = btnRef.current.getBoundingClientRect()
    return {
      position: 'fixed',
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    }
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => copied ? null : setShowConfirm(!showConfirm)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap rounded-lg transition-all ${
          copied
            ? 'bg-green-500 text-white'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        } ${className}`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            복사됨!
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" />
            서식 복사
          </>
        )}
      </button>

      {showConfirm && createPortal(
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black/40 z-40 md:bg-transparent"
            onClick={() => setShowConfirm(false)}
          />

          {/* 모바일: 바텀시트 */}
          <div
            ref={mobileSheetRef}
            className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 rounded-t-2xl z-50"
          >
            {/* 드래그 핸들 — p-4 없이 직접 배치해서 responsive-dialog와 동일한 간격 */}
            <div
              ref={dragHandleRef}
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
            >
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            <div className="flex items-start gap-3 mb-4 px-4">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                에디터에 따라 서식이 다르게 표시될 수 있습니다.
                정확한 결과를 원하시면 <strong>HTML 복사</strong> 후 HTML 모드에 붙여넣기를 권장합니다.
              </p>
            </div>
            <div className="flex gap-2 px-4 pb-[calc(1rem_+_env(safe-area-inset-bottom,_0px))]">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRichCopy}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl transition-colors active:bg-blue-700"
              >
                그래도 복사
              </button>
            </div>
          </div>

          {/* 데스크톱: 팝오버 */}
          <div
            ref={desktopPopoverRef}
            className="hidden md:block w-72 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50"
            style={getPopoverStyle()}
          >
            <div className="flex items-start gap-2.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                에디터에 따라 서식이 다르게 표시될 수 있습니다.
                정확한 결과를 원하시면 <strong>HTML 복사</strong> 후 HTML 모드에 붙여넣기를 권장합니다.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleRichCopy}
                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                그래도 복사
              </button>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
