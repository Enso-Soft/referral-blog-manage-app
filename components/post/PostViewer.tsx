'use client'

import { useState, useEffect, useMemo } from 'react'
import DOMPurify from 'dompurify'

const STORAGE_KEY = 'blog-content-width'
const PRESETS = [
  { label: '티스토리', value: 720 },
  { label: '네이버', value: 860 },
  { label: '전체', value: 0 },
]

interface PostViewerProps {
  content: string
}

export function PostViewer({ content }: PostViewerProps) {
  const [width, setWidth] = useState<number | null>(null)
  const sanitizedContent = useMemo(() => DOMPurify.sanitize(content, {
    ADD_ATTR: ['target', 'rel', 'style'],
    ADD_TAGS: ['iframe'],
  }), [content])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    setWidth(saved ? Number(saved) : 0)
  }, [])

  const handleWidthChange = (value: number) => {
    setWidth(value)
    if (value === 0) localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, String(value))
  }

  return (
    <div>
      {/* 너비 조절 툴바 - 모바일 숨김 */}
      <div className="hidden md:block mb-4 px-6 py-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">
            📐 본문 너비
          </span>
          <input
            type="range"
            min={400}
            max={1200}
            step={10}
            value={width ?? 1200}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="flex-1 min-w-[120px] max-w-[240px] h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-sm font-mono text-gray-500 dark:text-gray-400 w-16 text-right shrink-0">
            {width === null || width === 0 ? '전체' : `${width}px`}
          </span>
          <div className="flex gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleWidthChange(preset.value)}
                className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                  width !== null && width === preset.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 본문 콘텐츠 - 모바일은 박스 없이 바로 표시 */}
      <div
        className="md:bg-white md:dark:bg-gray-800 md:rounded-lg md:border md:border-gray-200 md:dark:border-gray-700 md:p-6 transition-all duration-200 overflow-hidden"
        style={width && width > 0 ? { maxWidth: `${width}px`, margin: '0 auto' } : undefined}
      >
        <div
          className="max-w-none text-gray-900 dark:text-gray-100 [&_ul]:list-disc [&_ol]:list-decimal [&_a]:text-blue-600 dark:[&_a]:text-blue-400 [&_a]:underline [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:text-xl [&_h3]:font-bold [&_h4]:text-lg [&_h4]:font-bold [&_h5]:text-base [&_h5]:font-bold [&_h6]:text-sm [&_h6]:font-bold [&_hr]:border-gray-300 dark:[&_hr]:border-gray-600 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_img]:max-w-full [&_img]:h-auto [&_figure_img]:mx-auto [&_table]:max-w-full [&_table]:overflow-x-auto [&_pre]:max-w-full [&_pre]:overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>
    </div>
  )
}
