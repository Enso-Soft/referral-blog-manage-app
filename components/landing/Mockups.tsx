'use client'

import type { ReactNode } from 'react'
import { Check, Sparkles } from 'lucide-react'

/** 브라우저 창 프레임 (스크린샷 느낌) */
function BrowserChrome({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card shadow-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-1.5 px-4 py-3 border-b border-border bg-secondary/40">
        <span className="w-3 h-3 rounded-full bg-red-400/70" />
        <span className="w-3 h-3 rounded-full bg-amber-400/70" />
        <span className="w-3 h-3 rounded-full bg-green-400/70" />
        <span className="ml-3 h-5 flex-1 max-w-[55%] rounded-md bg-muted/70" />
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  )
}

/** 본문 스켈레톤 한 줄 */
function Line({ w = 'w-full' }: { w?: string }) {
  return <div className={`h-3 rounded-full bg-muted ${w}`} />
}

/** 완성된 블로그 글 미리보기 */
export function BlogPostMock() {
  return (
    <BrowserChrome>
      {/* 대표 이미지 */}
      <div className="aspect-[16/7] rounded-xl bg-gradient-to-br from-violet-400/30 via-fuchsia-400/20 to-pink-400/20 mb-5 flex items-center justify-center">
        <Sparkles className="w-8 h-8 text-violet-500/50" />
      </div>
      <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 mb-3">
        홈카페
      </span>
      <h4 className="text-lg font-bold text-foreground mb-2">초보자를 위한 홈카페 입문 가이드</h4>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-5">
        <span>2026.06.19</span>
        <span>·</span>
        <span>1,240자</span>
      </div>
      <div className="space-y-2.5">
        <Line />
        <Line w="w-11/12" />
        <Line w="w-4/5" />
        <div className="h-2" />
        <div className="h-4 w-1/3 rounded bg-foreground/15 mb-1" />
        <Line w="w-10/12" />
        <Line w="w-full" />
        <Line w="w-3/4" />
      </div>
    </BrowserChrome>
  )
}

/** AI 대화형 편집 미리보기 */
export function ChatEditMock() {
  return (
    <BrowserChrome>
      <div className="space-y-4">
        {/* AI 초안 */}
        <div className="flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary/60 p-3 space-y-2">
            <Line />
            <Line w="w-5/6" />
          </div>
        </div>
        {/* 사용자 요청 */}
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white text-sm px-4 py-2.5">
            두 번째 문단을 더 친근한 말투로 바꿔줘
          </div>
        </div>
        {/* AI 수정본 */}
        <div className="flex gap-3">
          <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <div className="flex-1 rounded-2xl rounded-tl-sm bg-secondary/60 p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              <Check className="w-3.5 h-3.5" /> 수정 완료
            </div>
            <Line />
            <Line w="w-11/12" />
            <Line w="w-2/3" />
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        on ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-[18px]' : 'translate-x-[3px]'
        }`}
      />
    </span>
  )
}

/** 다중 플랫폼 발행 미리보기 */
export function PublishMock() {
  const platforms = [
    { name: 'WordPress', on: true },
    { name: 'Tistory', on: true },
    { name: 'Naver', on: true },
    { name: 'Threads', on: false },
  ]
  return (
    <BrowserChrome>
      <p className="text-sm font-bold text-foreground mb-4">어디에 발행할까요?</p>
      <div className="space-y-2.5 mb-5">
        {platforms.map((p) => (
          <div
            key={p.name}
            className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-xs font-bold text-foreground/70">
                {p.name[0]}
              </span>
              <span className="text-sm font-medium text-foreground">{p.name}</span>
            </div>
            <Toggle on={p.on} />
          </div>
        ))}
      </div>
      <div className="w-full rounded-xl bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white text-sm font-bold py-3 text-center shadow-lg shadow-violet-500/25">
        발행하기
      </div>
    </BrowserChrome>
  )
}
