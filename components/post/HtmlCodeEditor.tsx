'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor, IDisposable } from 'monaco-editor'
import { useTheme } from 'next-themes'

interface HtmlCodeEditorProps {
  content: string
  onChange: (html: string) => void
  onScroll?: (scrollPercent: number, firstVisibleLine: number) => void
  onCursorLineChange?: (lineNumber: number) => void
}

export function HtmlCodeEditor({ content, onChange, onScroll, onCursorLineChange }: HtmlCodeEditorProps) {
  const [mounted, setMounted] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const disposablesRef = useRef<IDisposable[]>([])
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  // cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      disposablesRef.current.forEach(d => d.dispose())
      disposablesRef.current = []
    }
  }, [])

  const editorTheme = resolvedTheme === 'dark' ? 'vs-dark' : 'light'

  const handleEditorDidMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
    // 이전 리스너 정리
    disposablesRef.current.forEach(d => d.dispose())
    disposablesRef.current = []

    // 스크롤 이벤트 리스너
    if (onScroll) {
      const scrollDisposable = editor.onDidScrollChange((e) => {
        const scrollTop = e.scrollTop
        const scrollHeight = editor.getScrollHeight()
        const clientHeight = editor.getLayoutInfo().height
        const maxScroll = scrollHeight - clientHeight

        // 보이는 첫 번째 줄 번호 가져오기
        const ranges = editor.getVisibleRanges()
        const firstVisibleLine = ranges.length > 0 ? ranges[0].startLineNumber : 1

        const scrollPercent = maxScroll > 0 ? scrollTop / maxScroll : 0
        onScroll(scrollPercent, firstVisibleLine)
      })
      disposablesRef.current.push(scrollDisposable)
    }

    // 커서 위치 변경 이벤트 리스너
    if (onCursorLineChange) {
      const cursorDisposable = editor.onDidChangeCursorPosition((e) => {
        onCursorLineChange(e.position.lineNumber)
      })
      disposablesRef.current.push(cursorDisposable)
    }
  }, [onScroll, onCursorLineChange])

  if (!mounted) {
    return (
      <div className="h-[700px] bg-gray-900 dark:bg-gray-950 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">에디터 로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <Editor
        height="700px"
        language="html"
        value={content}
        onChange={(value) => onChange(value || '')}
        onMount={handleEditorDidMount}
        theme={editorTheme}
        options={{
          minimap: { enabled: true },
          fontSize: 14,
          lineNumbers: 'on',
          wordWrap: 'on',
          automaticLayout: true,
          scrollBeyondLastLine: false,
          padding: { top: 16, bottom: 16 },
          tabSize: 2,
          formatOnPaste: true,
          formatOnType: true,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  )
}
