'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const DISCLAIMERS = {
  naver: {
    label: '네이버 문구',
    detectPattern: 'naver.me',
    checkText: '네이버 쇼핑 커넥트 활동의 일환',
    html: '<div style="text-align: center; padding: 12px 16px; background-color: #f8f9fa; margin-bottom: 24px; font-size: 13px; color: #333 !important; border-radius: 8px;">이 포스팅은 네이버 쇼핑 커넥트 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다.</div>',
    activeColor: 'bg-green-600 hover:bg-green-700 text-white',
    inactiveColor: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
  },
  coupang: {
    label: '쿠팡 문구',
    detectPattern: 'link.coupang.com',
    checkText: '쿠팡 파트너스 활동의 일환',
    html: '<div style="text-align: center; padding: 12px 16px; background-color: #f8f9fa; margin-bottom: 24px; font-size: 13px; color: #333 !important; border-radius: 8px;">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 판매 발생 시 수수료를 제공받습니다.</div>',
    activeColor: 'bg-red-600 hover:bg-red-700 text-white',
    inactiveColor: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700',
  },
} as const

interface DisclaimerButtonsProps {
  content: string
  onInsert: (html: string) => void
}

export function DisclaimerButtons({ content, onInsert }: DisclaimerButtonsProps) {
  const [confirmKey, setConfirmKey] = useState<keyof typeof DISCLAIMERS | null>(null)

  const handleClick = (key: keyof typeof DISCLAIMERS) => {
    const disclaimer = DISCLAIMERS[key]
    if (content.includes(disclaimer.checkText)) {
      setConfirmKey(key)
    } else {
      onInsert(disclaimer.html)
    }
  }

  const handleConfirm = () => {
    if (confirmKey) {
      onInsert(DISCLAIMERS[confirmKey].html)
      setConfirmKey(null)
    }
  }

  return (
    <>
      <span className="text-xs font-medium text-foreground whitespace-nowrap">대가성 문구 추가</span>
      {(Object.keys(DISCLAIMERS) as (keyof typeof DISCLAIMERS)[]).map((key) => {
        const d = DISCLAIMERS[key]
        const isHighlighted = content.includes(d.detectPattern)
        return (
          <Button
            key={key}
            variant="ghost"
            onClick={() => handleClick(key)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 h-auto text-xs font-medium whitespace-nowrap rounded-xl transition-colors shadow-sm ${
              isHighlighted ? d.activeColor : d.inactiveColor
            }`}
          >
            {d.label}
          </Button>
        )
      })}

      {/* Confirm Modal */}
      <Dialog open={!!confirmKey} onOpenChange={(open) => { if (!open) setConfirmKey(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>문구 중복 확인</DialogTitle>
            <DialogDescription>
              이미 해당 문구가 감지되었습니다. 추가로 삽입하시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmKey(null)}>
              취소
            </Button>
            <Button onClick={handleConfirm}>
              삽입
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
