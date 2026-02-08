'use client'

import { useState } from 'react'

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
          <button
            key={key}
            onClick={() => handleClick(key)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap rounded-xl transition-colors shadow-sm ${
              isHighlighted ? d.activeColor : d.inactiveColor
            }`}
          >
            {d.label}
          </button>
        )
      })}

      {/* Confirm Modal */}
      {confirmKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-sm mx-4">
            <p className="text-sm text-gray-800 dark:text-gray-200 mb-4">
              이미 해당 문구가 감지되었습니다. 추가로 삽입하시겠습니까?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmKey(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                삽입
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
