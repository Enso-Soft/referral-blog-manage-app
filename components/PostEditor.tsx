'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Eye, Code, AlertTriangle, Save, Loader2, Columns } from 'lucide-react'

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

interface BlockMapping {
  startLine: number
  endLine: number
  tagName: string
}

// HTML을 파싱하여 블록 요소별 시작/끝 줄 번호 추출
function parseBlockMappings(html: string): BlockMapping[] {
  const lines = html.split('\n')
  const mappings: BlockMapping[] = []
  const blockRegex = new RegExp(`<(${BLOCK_ELEMENTS.join('|')})(?:\\s|>|/>)`, 'gi')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match
    blockRegex.lastIndex = 0

    while ((match = blockRegex.exec(line)) !== null) {
      mappings.push({
        startLine: i + 1, // 1-based line number
        endLine: i + 1,
        tagName: match[1].toLowerCase(),
      })
    }
  }

  return mappings
}

// 줄 번호로 해당 블록 인덱스 찾기
function findBlockIndexByLine(mappings: BlockMapping[], lineNumber: number): number {
  // 해당 줄 이하에서 가장 가까운 블록 찾기
  let closestIndex = -1
  for (let i = 0; i < mappings.length; i++) {
    if (mappings[i].startLine <= lineNumber) {
      closestIndex = i
    } else {
      break
    }
  }
  return closestIndex
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
  const [content, setContent] = useState(initialContent)
  const [mode, setMode] = useState<EditorMode>('split')
  const [saving, setSaving] = useState(false)
  const [warnings, setWarnings] = useState<string[]>([])
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(-1)

  // refs
  const originalContent = useRef(initialContent)
  const previewRef = useRef<HTMLDivElement>(null)
  const lastScrolledBlockIndex = useRef<number>(-1)

  // HTML 블록 매핑 (content가 변경될 때만 재계산)
  const blockMappings = useMemo(() => parseBlockMappings(content), [content])

  // 디바운스된 스크롤 함수 (150ms)
  const debouncedScrollToBlock = useMemo(
    () =>
      debounce((blockIndex: number) => {
        if (!previewRef.current || blockIndex < 0) return
        if (blockIndex === lastScrolledBlockIndex.current) return

        // 미리보기에서 모든 블록 요소 수집
        const previewContainer = previewRef.current.querySelector('.max-w-none')
        if (!previewContainer) return

        const allBlockElements: Element[] = []
        const selector = BLOCK_ELEMENTS.join(',')
        previewContainer.querySelectorAll(selector).forEach((el) => {
          allBlockElements.push(el)
        })

        if (blockIndex < allBlockElements.length) {
          const targetElement = allBlockElements[blockIndex] as HTMLElement
          const container = previewRef.current!

          // 컨테이너 내부에서만 스크롤되도록 직접 계산
          const containerRect = container.getBoundingClientRect()
          const elementRect = targetElement.getBoundingClientRect()
          const relativeTop = elementRect.top - containerRect.top + container.scrollTop

          // 요소가 컨테이너 중앙에 오도록 스크롤
          const targetScroll = relativeTop - (container.clientHeight / 2) + (elementRect.height / 2)
          container.scrollTo({
            top: Math.max(0, targetScroll),
            behavior: 'smooth'
          })

          lastScrolledBlockIndex.current = blockIndex
        }
      }, 150),
    []
  )

  // 커서 줄 번호 변경 핸들러
  const handleCursorLineChange = useCallback(
    (lineNumber: number) => {
      const blockIndex = findBlockIndexByLine(blockMappings, lineNumber)
      if (blockIndex >= 0) {
        setActiveBlockIndex(blockIndex) // 활성 블록 업데이트
        debouncedScrollToBlock(blockIndex)
      }
    },
    [blockMappings, debouncedScrollToBlock]
  )

  // 활성 블록 스타일 적용
  // 활성 블록 스타일 적용
  useEffect(() => {
    if (!previewRef.current || activeBlockIndex < 0) return

    const previewContainer = previewRef.current.querySelector('.max-w-none')
    if (!previewContainer) return

    const allBlockElements = previewContainer.querySelectorAll(BLOCK_ELEMENTS.join(','))

    // 기존 활성 클래스 제거
    allBlockElements.forEach(el => el.classList.remove('preview-active-block'))

    // 새 활성 블록 클래스 추가
    if (activeBlockIndex < allBlockElements.length) {
      const targetElement = allBlockElements[activeBlockIndex] as HTMLElement
      targetElement.classList.add('preview-active-block')
    }
  }, [activeBlockIndex])

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


  // 스크롤 동기화
  const handleEditorScroll = useCallback((scrollPercent: number, firstVisibleLine: number) => {
    // 1. 퍼센트 기반 스크롤 (백업/기본) - 문서가 너무 짧거나 블록을 못 찾을 때 유용
    // 하지만 라인 기반이 훨씬 정확하므로 라인 매핑을 우선 시도

    if (!previewRef.current) return

    // 해당 라인에 매핑된 블록 찾기
    const blockIndex = findBlockIndexByLine(blockMappings, firstVisibleLine)

    if (blockIndex >= 0) {
      // 블록을 찾았으면 해당 블록으로 스크롤 (debounced version 호출 대신 즉시 계산하여 부드럽게 이동)
      // 스크롤 이벤트는 빈번하므로 debounce 보다는 requestAnimationFrame 등을 쓰는게 좋지만,
      // 여기서는 직접 계산해서 scrollTo 호출.

      const previewContainer = previewRef.current.querySelector('.max-w-none')
      if (!previewContainer) return

      const allBlockElements = previewContainer.querySelectorAll(BLOCK_ELEMENTS.join(','))
      if (blockIndex < allBlockElements.length) {
        const targetElement = allBlockElements[blockIndex] as HTMLElement
        const container = previewRef.current

        // --- Intra-block Interpolation Logic ---
        // 블록 간 "점프"를 방지하기 위해, 현재 라인이 블록 내에서 어디쯤인지(ratio) 계산
        const currentBlock = blockMappings[blockIndex]
        const nextBlock = blockMappings[blockIndex + 1]

        // 현재 블록의 끝 라인 추정 (다음 블록 시작 직전, 혹은 문서 끝)
        // 다음 블록이 없으면 현재 블록 시작 + 10 (임의)
        const endLine = nextBlock ? nextBlock.startLine : (currentBlock.startLine + 10)

        // 현재 라인이 블록 내에서 진행된 비율 (0.0 ~ 1.0)
        const blockHeightLines = Math.max(1, endLine - currentBlock.startLine)
        const lineOffset = Math.max(0, firstVisibleLine - currentBlock.startLine)

        // 비율 클램핑 (0~1)
        const ratio = Math.min(1, Math.max(0, lineOffset / blockHeightLines))

        // --- Position Calculation ---
        // 컨테이너 내부 절대 위치 계산
        const containerRect = container.getBoundingClientRect()
        const elementRect = targetElement.getBoundingClientRect()

        // 현재 스크롤 위치 + 뷰포트 상대 위치 = 절대 위치 (컨테이너 기준)
        const elementTop = elementRect.top - containerRect.top + container.scrollTop

        // 블록의 높이 * 비율 만큼 추가로 스크롤
        const additionalScroll = targetElement.offsetHeight * ratio

        const finalScrollTop = elementTop + additionalScroll

        // 상단에 여백을 조금 두고 스크롤 (예: 20px)
        container.scrollTo({
          top: Math.max(0, finalScrollTop - 20),
          behavior: 'auto' // 중요: 매 프레임 계산하므로 auto가 가장 부드러움 (smooth는 중첩되어 렉 유발)
        })
        return
      }
    }

    // 블록을 못 찾은 경우 퍼센트 기반으로 대체 (최상단/최하단 등)
    const maxScroll = previewRef.current.scrollHeight - previewRef.current.clientHeight
    previewRef.current.scrollTop = maxScroll * scrollPercent
  }, [blockMappings])

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

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setMode('split')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'split'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Columns className="w-4 h-4" />
            HTML + 미리보기
          </button>
          <button
            onClick={() => setMode('html')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'html'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Code className="w-4 h-4" />
            HTML 전체화면
          </button>
          <button
            onClick={() => setMode('preview')}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${mode === 'preview'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
          >
            <Eye className="w-4 h-4" />
            미리보기 전체화면
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {content !== originalContent.current && (
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              원본 복원
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            저장
          </button>
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

      {/* Editor Area */}
      {mode === 'html' && (
        <div className="min-h-[700px]">
          <HtmlCodeEditor content={content} onChange={handleContentChange} />
        </div>
      )}

      {/* Split View: HTML + Preview */}
      {mode === 'split' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="min-h-[700px]">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">HTML 코드</div>
            <HtmlCodeEditor
              content={content}
              onChange={handleContentChange}
              onScroll={handleEditorScroll}
              onCursorLineChange={handleCursorLineChange}
            />
          </div>
          <div className="min-h-[700px]">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">미리보기</div>
            <div
              ref={previewRef}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 h-[700px] overflow-auto"
            >
              <div
                className="max-w-none text-gray-900 dark:text-gray-100"
                dangerouslySetInnerHTML={{ __html: content }}
              />
            </div>
          </div>
        </div>
      )}

      {mode === 'preview' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 min-h-[700px]">
          <div
            className="max-w-none text-gray-900 dark:text-gray-100"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      )}
    </div>
  )
}
