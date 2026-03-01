'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ScanFace, Wand2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { icon: Upload, label: '이미지 업로드 중', duration: 3000 },
  { icon: ScanFace, label: '헤어스타일 분석 중', duration: 8000 },
  { icon: Wand2, label: 'AI 이미지 생성 중', duration: 40000 },
  { icon: Sparkles, label: '마무리 작업 중', duration: 10000 },
]

const TIPS = [
  '정면 사진일수록 더 자연스러운 결과를 얻을 수 있어요',
  '밝은 조명 아래 촬영한 사진이 효과적이에요',
  '머리카락이 잘 보이는 사진을 사용해 보세요',
  '다양한 헤어스타일을 시도해 보세요!',
  '텍스트 설명이 구체적일수록 원하는 결과에 가까워요',
  '같은 사진으로 여러 스타일을 비교해 보세요',
]

export function HairstyleLoadingProgress() {
  const [currentStep, setCurrentStep] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  // 랜덤 시작 팁
  const shuffledTips = useMemo(() => {
    const arr = [...TIPS]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }, [])

  // 단계 자동 진행
  useEffect(() => {
    if (currentStep >= STEPS.length - 1) return
    const timer = setTimeout(() => {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1))
    }, STEPS[currentStep].duration)
    return () => clearTimeout(timer)
  }, [currentStep])

  // 팁 자동 교체
  useEffect(() => {
    const timer = setInterval(() => {
      setTipIndex((i) => (i + 1) % shuffledTips.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [shuffledTips.length])

  const CurrentIcon = STEPS[currentStep].icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-8 rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-950/30"
    >
      {/* 상단: 단계 인디케이터 */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500',
                i < currentStep && 'bg-violet-500 text-white scale-100',
                i === currentStep && 'bg-violet-500 text-white ai-pulse-ring scale-110',
                i > currentStep && 'bg-violet-200 dark:bg-violet-800/50 text-violet-400 dark:text-violet-600'
              )}
            >
              {i < currentStep ? (
                <motion.svg
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={3}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </motion.svg>
              ) : (
                i + 1
              )}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'w-6 sm:w-10 h-0.5 transition-colors duration-500',
                  i < currentStep ? 'bg-violet-500' : 'bg-violet-200 dark:bg-violet-800/50'
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* 중앙: 현재 단계 아이콘 + 라벨 */}
      <div className="flex flex-col items-center gap-4 mb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-900/50 flex items-center justify-center"
          >
            <CurrentIcon className="w-8 h-8 text-violet-600 dark:text-violet-400" />
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.p
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-violet-700 dark:text-violet-300 font-medium text-lg"
          >
            {STEPS[currentStep].label}
          </motion.p>
        </AnimatePresence>

        {/* 진행 바 */}
        <div className="w-48 h-1.5 bg-violet-200 dark:bg-violet-800/50 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 ai-shimmer rounded-full" />
        </div>
      </div>

      {/* 하단: 팁 */}
      <div className="h-10 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={tipIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm text-violet-500 dark:text-violet-400 text-center float-animation"
          >
            {shuffledTips[tipIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
