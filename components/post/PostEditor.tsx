'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { sanitizeHtml } from '@/lib/sanitize'
import { Eye, Code, AlertTriangle, Save, Loader2, Columns } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DisclaimerButtons } from './DisclaimerButtons'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { HtmlCodeEditorHandle } from './HtmlCodeEditor'

// Dynamic imports for heavy editors
const HtmlCodeEditor = dynamic(
  () => import('./HtmlCodeEditor').then((mod) => mod.HtmlCodeEditor),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 bg-gray-900 dark:bg-gray-950 rounded-lg animate-pulse" />
    ),
  }
)

interface PostEditorProps {
  initialContent: string
  onSave: (content: string) => Promise<void>
}

type EditorMode = 'html' | 'split' | 'preview'

// Tistory incompatible tags/attributes checker
const TISTORY_WARNINGS = [
  { pattern: /<script/i, message: 'script 태그는 티스토리에서 제한됩니다' },
  { pattern: /<iframe/i, message: 'iframe 태그는 주의가 필요합니다' },
  { pattern: /position:\s*fixed/i, message: 'position: fixed는 동작하지 않을 수 있습니다' },
  { pattern: /<form/i, message: 'form 태그는 제한될 수 있습니다' },
]

// 블록 요소 목록
const BLOCK_ELEMENTS = ['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'ul', 'ol', 'li', 'section', 'article', 'header', 'footer', 'main', 'aside', 'nav', 'figure', 'figcaption', 'blockquote', 'pre', 'hr', 'br', 'img']

// 미리보기 HTML에 data-source-line 속성 추가 (줄 번호 기반 매핑)
function addLineAttributes(html: string): string {
  const lines = html.split('\n')
  const blockRegex = new RegExp(`(<(?:${BLOCK_ELEMENTS.join('|')}))(\\s|>|/>)`, 'gi')
  return lines.map((line, i) => {
    const lineNum = i + 1
    blockRegex.lastIndex = 0
    return line.replace(blockRegex, (_, tagStart, after) => {
      return `${tagStart} data-source-line="${lineNum}"${after}`
    })
  }).join('\n')
}

// data-source-line 속성으로 가장 가까운 요소 찾기
function findElementByLine(container: Element, lineNumber: number): HTMLElement | null {
  const elements = container.querySelectorAll('[data-source-line]')
  let closest: HTMLElement | null = null
  for (const el of elements) {
    const line = parseInt(el.getAttribute('data-source-line')!)
    if (line <= lineNumber) closest = el as HTMLElement
    else break
  }
  return closest
}

// 현재 요소와 다음 요소의 줄 번호 반환 (스크롤 보간용)
function findElementAndNextByLine(container: Element, lineNumber: number): { element: HTMLElement, currentLine: number, nextLine: number } | null {
  const elements = container.querySelectorAll('[data-source-line]')
  let closest: HTMLElement | null = null
  let closestLine = 0
  let nextLine = 0

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i] as HTMLElement
    const line = parseInt(el.getAttribute('data-source-line')!)
    if (line <= lineNumber) {
      closest = el
      closestLine = line
      nextLine = (i + 1 < elements.length)
        ? parseInt(elements[i + 1].getAttribute('data-source-line')!)
        : closestLine + 10
    } else {
      if (!closest) return null
      nextLine = line
      break
    }
  }

  if (!closest) return null
  return { element: closest, currentLine: closestLine, nextLine }
}

// 스크롤 컨테이너 상단 기준으로 가장 가까운 data-source-line 값 추출
function getLineFromContainerScroll(container: HTMLElement): number {
  const elements = container.querySelectorAll('[data-source-line]')
  const containerRect = container.getBoundingClientRect()

  let closestLine = 1
  let closestDistance = Infinity

  for (const el of elements) {
    const rect = (el as HTMLElement).getBoundingClientRect()
    const relativeTop = rect.top - containerRect.top
    const distance = Math.abs(relativeTop)

    if (distance < closestDistance) {
      closestDistance = distance
      closestLine = parseInt(el.getAttribute('data-source-line')!)
    }

    if (relativeTop > containerRect.height) break
  }

  return closestLine
}

// 디바운스 유틸리티
function debounce<T extends (...args: Parameters<T>) => void>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }) as T
}

export function PostEditor({ initialContent, onSave }: PostEditorProps) {
  const isMobile = useIsMobile()
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<EditorMode>('split')
  const [saving, setSaving] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [activeSourceLine, setActiveSourceLine] = useState<number>(-1)

  // refs
  const originalContent = useRef(initialContent)
  const previewRef = useRef<HTMLDivElement>(null)
  const htmlEditorRef = useRef<HtmlCodeEditorHandle>(null)
  const splitPreviewRef = useRef<HTMLDivElement>(null)
  const lastScrolledLine = useRef<number>(-1)
  const rafRef = useRef<number | null>(null)

  // 모드 전환 시 스크롤 싱크를 위한 추적 ref
  const lastEditorLine = useRef<number>(1)
  const lastPreviewScrollPercent = useRef<number>(0)

  // 모바일에서 split 모드 비활성화 — split 선택 중 모바일 전환 시 html로 fallback
  useEffect(() => {
    if (isMobile && mode === 'split') {
      setMode('html')
    }
  }, [isMobile, mode])

  // 미리보기용 HTML (data-source-line 속성 포함 + XSS sanitize)
  const previewContent = useMemo(() => sanitizeHtml(addLineAttributes(content), ['data-source-line']), [content])

  // 디바운스된 스크롤 함수 (150ms)
  const debouncedScrollToElement = useMemo(
    () =>
      debounce((lineNumber: number) => {
        if (!splitPreviewRef.current || lineNumber < 0) return
        if (lineNumber === lastScrolledLine.current) return

        const previewContainer = splitPreviewRef.current.querySelector('.max-w-none')
        if (!previewContainer) return

        const targetElement = findElementByLine(previewContainer, lineNumber)
        if (!targetElement) return

        const container = splitPreviewRef.current!
        const containerRect = container.getBoundingClientRect()
        const elementRect = targetElement.getBoundingClientRect()
        const relativeTop = elementRect.top - containerRect.top + container.scrollTop

        const targetScroll = relativeTop - (container.clientHeight / 2) + (elementRect.height / 2)
        container.scrollTo({
          top: Math.max(0, targetScroll),
          behavior: 'smooth'
        })

        lastScrolledLine.current = lineNumber
      }, 150),
    []
  )

  // 커서 줄 번호 변경 핸들러
  const handleCursorLineChange = useCallback(
    (lineNumber: number) => {
      setActiveSourceLine(lineNumber)
      debouncedScrollToElement(lineNumber)
    },
    [debouncedScrollToElement]
  )

  // 활성 블록 스타일 적용
  useEffect(() => {
    if (!splitPreviewRef.current || activeSourceLine < 0) return

    const previewContainer = splitPreviewRef.current.querySelector('.max-w-none')
    if (!previewContainer) return

    // 기존 활성 클래스 제거
    previewContainer.querySelectorAll('.preview-active-block').forEach(el =>
      el.classList.remove('preview-active-block')
    )

    // data-source-line 기반으로 가장 가까운 요소 찾아 하이라이트
    const targetElement = findElementByLine(previewContainer, activeSourceLine)
    if (targetElement) {
      targetElement.classList.add('preview-active-block')
    }
  }, [activeSourceLine])

  const checkTistoryCompatibility = useCallback((html: string) => {
    const newWarnings: string[] = []
    TISTORY_WARNINGS.forEach(({ pattern, message }) => {
      if (pattern.test(html)) {
        newWarnings.push(message)
      }
    })
    setWarnings(newWarnings)
  }, [])

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent)
      checkTistoryCompatibility(newContent)
    },
    [checkTistoryCompatibility]
  )

  // html 모드의 에디터 스크롤 추적
  const handleHtmlEditorScroll = useCallback((scrollPercent: number, firstVisibleLine: number) => {
    lastEditorLine.current = firstVisibleLine
    lastPreviewScrollPercent.current = scrollPercent
  }, [])

  // split 모드의 스크롤 동기화 (requestAnimationFrame 적용)
  const handleEditorScroll = useCallback((scrollPercent: number, firstVisibleLine: number) => {
    lastEditorLine.current = firstVisibleLine
    lastPreviewScrollPercent.current = scrollPercent

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!splitPreviewRef.current) return

      const previewContainer = splitPreviewRef.current.querySelector('.max-w-none')
      if (!previewContainer) return

      const result = findElementAndNextByLine(previewContainer, firstVisibleLine)

      if (result) {
        const { element: targetElement, currentLine, nextLine } = result
        const container = splitPreviewRef.current!

        // --- Intra-block Interpolation ---
        const blockHeightLines = Math.max(1, nextLine - currentLine)
        const lineOffset = Math.max(0, firstVisibleLine - currentLine)
        const ratio = Math.min(1, Math.max(0, lineOffset / blockHeightLines))

        // --- Position Calculation ---
        const containerRect = container.getBoundingClientRect()
        const elementRect = targetElement.getBoundingClientRect()
        const elementTop = elementRect.top - containerRect.top + container.scrollTop
        const additionalScroll = targetElement.offsetHeight * ratio
        const finalScrollTop = elementTop + additionalScroll

        container.scrollTo({
          top: Math.max(0, finalScrollTop - 20),
          behavior: 'auto'
        })
        return
      }

      // 요소를 못 찾은 경우 퍼센트 기반 대체
      const maxScroll = splitPreviewRef.current.scrollHeight - splitPreviewRef.current.clientHeight
      splitPreviewRef.current.scrollTop = maxScroll * scrollPercent
    })
  }, [])

  // cleanup RAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // 모드 전환 핸들러 — 에디터/미리보기는 항상 마운트, display toggle로 스크롤 보존
  const handleModeChange = useCallback((newMode: EditorMode) => {
    const prevMode = mode
    setMode(newMode)

    // 코드 → 미리보기: 에디터 라인 기반으로 프리뷰 스크롤
    if ((prevMode === 'html' || prevMode === 'split') && newMode === 'preview') {
      const line = htmlEditorRef.current?.getFirstVisibleLine() ?? lastEditorLine.current
      requestAnimationFrame(() => {
        if (!previewRef.current) return
        const previewContainer = previewRef.current.querySelector('.max-w-none')
        if (!previewContainer) return

        const targetElement = findElementByLine(previewContainer, line)
        if (targetElement) {
          const container = previewRef.current!
          const containerRect = container.getBoundingClientRect()
          const elementRect = targetElement.getBoundingClientRect()
          const relativeTop = elementRect.top - containerRect.top + container.scrollTop
          container.scrollTo({ top: Math.max(0, relativeTop - 20), behavior: 'auto' })
        }
      })
    }

    // 미리보기 → 코드: 에디터는 항상 마운트 상태이므로 스크롤 자동 보존, layout만 갱신
    if (prevMode === 'preview' && newMode === 'html') {
      requestAnimationFrame(() => {
        htmlEditorRef.current?.layout()
      })
    }
  }, [mode])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(content)
      originalContent.current = content
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (window.confirm('모든 변경사항을 취소하고 원본으로 복원하시겠습니까?')) {
      setContent(originalContent.current)
    }
  }

  const editorHeight = isMobile ? 'calc(100dvh - 240px)' : '700px'

  return (
    <div className="space-y-4">
      {/* Action Buttons Row (대가성 문구 + 저장/원본복원) */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <DisclaimerButtons
            content={content}
            onInsert={(html) => handleContentChange(html + '\n' + content)}
            isMobile={isMobile}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {content !== originalContent.current && (
            <Button
              variant="outline"
              size={isMobile ? 'sm' : 'default'}
              onClick={handleReset}
            >
              원본 복원
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            size={isMobile ? 'sm' : 'default'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장
          </Button>
        </div>
      </div>

      {/* Sticky Mode Tabs — Header(h-16=4rem) 아래 고정 */}
      <div className="sticky top-16 z-30 bg-background/95 backdrop-blur-sm pb-2 -mx-1 px-1 pt-2 -mt-2">
        <div className={`flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 ${isMobile ? 'w-full' : 'w-fit'}`}>
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleModeChange('split')}
              className={`rounded-md ${mode === 'split'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-white dark:hover:bg-gray-700'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
            >
              <Columns className="w-4 h-4" />
              HTML + 미리보기
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleModeChange('html')}
            className={`rounded-md ${isMobile ? 'flex-1' : ''} ${mode === 'html'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-white dark:hover:bg-gray-700'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Code className="w-4 h-4" />
            {isMobile ? '코드' : 'HTML 전체화면'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleModeChange('preview')}
            className={`rounded-md ${isMobile ? 'flex-1' : ''} ${mode === 'preview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm hover:bg-white dark:hover:bg-gray-700'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Eye className="w-4 h-4" />
            {isMobile ? '미리보기' : '미리보기 전체화면'}
          </Button>
        </div>
      </div>

      {/* Tistory Compatibility Warnings */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-400 font-medium mb-2">
            <AlertTriangle className="w-4 h-4" />
            티스토리 호환성 경고
          </div>
          <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-500 space-y-1">
            {warnings.map((warning, i) => (
              <li key={i}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor (항상 마운트, display toggle — 스크롤 위치 보존) */}
      <div style={{ display: mode === 'html' ? 'block' : 'none' }}>
        <HtmlCodeEditor
          ref={htmlEditorRef}
          content={content}
          onChange={handleContentChange}
          onScroll={handleHtmlEditorScroll}
          height={editorHeight}
          isMobile={isMobile}
        />
      </div>

      {/* Preview (항상 마운트, display toggle — 스크롤 위치 보존) */}
      <div
        ref={previewRef}
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 overflow-auto"
        style={{ display: mode === 'preview' ? 'block' : 'none', height: editorHeight }}
      >
        <div
          className="max-w-none text-gray-900 dark:text-gray-100"
          dangerouslySetInnerHTML={{ __html: previewContent }}
        />
      </div>

      {/* Split View: HTML + Preview (desktop only) */}
      {mode === 'split' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="min-h-[700px]">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">HTML 코드</div>
            <HtmlCodeEditor
              content={content}
              onChange={handleContentChange}
              onScroll={handleEditorScroll}
              onCursorLineChange={handleCursorLineChange}
              height="700px"
              isMobile={false}
            />
          </div>
          <div className="min-h-[700px]">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">미리보기</div>
            <div
              ref={splitPreviewRef}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-[700px] overflow-auto"
            >
              <div
                className="max-w-none text-gray-900 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: previewContent }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
