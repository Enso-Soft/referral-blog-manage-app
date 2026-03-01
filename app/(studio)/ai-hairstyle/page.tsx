'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors,
  ImagePlus,
  Loader2,
  Trash2,
  RefreshCw,
  Type,
  Image as ImageIcon,
  ArrowRight,
  ArrowDown,
} from 'lucide-react'
import { cn, resizeImageFile } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useCredit } from '@/context/CreditContext'
import { DEFAULT_CREDIT_SETTINGS } from '@/lib/schemas/credit'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { HairstyleResultGallery } from '@/components/ai/HairstyleResultGallery'
import { HairstyleLoadingProgress } from '@/components/ai/HairstyleLoadingProgress'
import { useImageDropZone } from '@/hooks/useImageDropZone'
import Link from 'next/link'

const CREATIVITY_OPTIONS = [
  { value: 'strict' as const, label: '정확히 복사' },
  { value: 'balanced' as const, label: '균형' },
  { value: 'creative' as const, label: '자유롭게' },
]

function AIHairstylePage() {
  // Form state
  const [faceImage, setFaceImage] = useState<{ file: File; preview: string } | null>(null)
  const [hairstyleImage, setHairstyleImage] = useState<{ file: File; preview: string } | null>(null)
  const [hairstyleTab, setHairstyleTab] = useState<'image' | 'text'>('image')
  const [textPrompt, setTextPrompt] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [faceMosaic, setFaceMosaic] = useState(false)
  const [creativityLevel, setCreativityLevel] = useState<'strict' | 'balanced' | 'creative'>('balanced')
  const [detailLevel, setDetailLevel] = useState<'standard' | 'high'>('standard')

  // Result state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ faceImageUrl: string; resultImageUrls: string[] } | null>(null)

  const { authFetch } = useAuthFetch()

  const faceInputRef = useRef<HTMLInputElement>(null)
  const hairstyleInputRef = useRef<HTMLInputElement>(null)
  const faceImageRef = useRef(faceImage)
  const hairstyleImageRef = useRef(hairstyleImage)
  faceImageRef.current = faceImage
  hairstyleImageRef.current = hairstyleImage

  // unmount 시 objectURL 정리
  useEffect(() => {
    return () => {
      if (faceImageRef.current) URL.revokeObjectURL(faceImageRef.current.preview)
      if (hairstyleImageRef.current) URL.revokeObjectURL(hairstyleImageRef.current.preview)
    }
  }, [])

  // 이미지 파일 처리 공통 함수
  const processImageFile = useCallback(async (
    file: File,
    target: 'face' | 'hairstyle'
  ) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('jpg, png, webp 형식만 지원합니다')
      return
    }
    try {
      const resized = await resizeImageFile(file, 1024)
      const preview = URL.createObjectURL(resized)
      if (target === 'face') {
        setFaceImage(prev => {
          if (prev) URL.revokeObjectURL(prev.preview)
          return { file: resized, preview }
        })
      } else {
        setHairstyleImage(prev => {
          if (prev) URL.revokeObjectURL(prev.preview)
          return { file: resized, preview }
        })
      }
      setSubmitError(null)
    } catch {
      setSubmitError('이미지 처리 중 오류가 발생했습니다')
    }
  }, [])

  // 이미지 선택 핸들러
  const handleFaceImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processImageFile(file, 'face')
    if (faceInputRef.current) faceInputRef.current.value = ''
  }, [processImageFile])

  const handleHairstyleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    await processImageFile(file, 'hairstyle')
    if (hairstyleInputRef.current) hairstyleInputRef.current.value = ''
  }, [processImageFile])

  const removeFaceImage = useCallback(() => {
    setFaceImage(prev => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return null
    })
  }, [])

  const removeHairstyleImage = useCallback(() => {
    setHairstyleImage(prev => {
      if (prev) URL.revokeObjectURL(prev.preview)
      return null
    })
  }, [])

  // Drag & Drop
  const faceDropZone = useImageDropZone({
    onDrop: (file) => processImageFile(file, 'face'),
    onError: setSubmitError,
  })

  const hairstyleDropZone = useImageDropZone({
    onDrop: (file) => processImageFile(file, 'hairstyle'),
    onError: setSubmitError,
  })

  // 붙여넣기
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) return

          // 얼굴이 비어있으면 얼굴에, 아니면 헤어스타일에
          const target = !faceImageRef.current ? 'face' : 'hairstyle'
          await processImageFile(file, target)
          return
        }
      }
    }

    document.addEventListener('paste', handler)
    return () => document.removeEventListener('paste', handler)
  }, [processImageFile])

  // 폼 제출
  const handleSubmit = useCallback(async () => {
    if (!faceImage) {
      setSubmitError('얼굴 사진을 업로드해주세요')
      return
    }

    const hasHairstyleImage = hairstyleTab === 'image' && hairstyleImage
    const hasTextPrompt = hairstyleTab === 'text' && textPrompt.trim()

    if (!hasHairstyleImage && !hasTextPrompt) {
      setSubmitError('헤어스타일 이미지 또는 텍스트 설명을 입력해주세요')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('face_image', faceImage.file)

      if (hasHairstyleImage) {
        formData.append('hairstyle_image', hairstyleImage.file)
      }
      if (hasTextPrompt) {
        formData.append('prompt', textPrompt.trim())
      }
      if (additionalPrompt.trim()) {
        formData.append('additional_prompt', additionalPrompt.trim())
      }
      formData.append('options', JSON.stringify({
        faceMosaic,
        creativityLevel,
        detailLevel,
      }))

      const res = await authFetch('/api/ai/hairstyle-preview', {
        method: 'POST',
        body: formData,
        timeout: 120_000,
      } as RequestInit & { timeout?: number })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '요청에 실패했습니다')
      }

      setResult({
        faceImageUrl: data.faceImageUrl,
        resultImageUrls: data.resultImageUrls,
      })

    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }, [faceImage, hairstyleImage, hairstyleTab, textPrompt, additionalPrompt, faceMosaic, creativityLevel, detailLevel, authFetch])

  // 다시 생성
  const handleReset = useCallback(() => {
    setResult(null)
    setSubmitError(null)
  }, [])

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              AI 헤어스타일 미리보기
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              얼굴 사진에 원하는 헤어스타일을 적용해 봅니다
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* 에러 메시지 */}
        <AnimatePresence>
          {submitError && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm"
            >
              {submitError}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 결과 영역 */}
        <AnimatePresence mode="wait">
          {isSubmitting && (
            <HairstyleLoadingProgress key="loading" />
          )}

          {!isSubmitting && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 rounded-2xl border border-green-200 dark:border-green-800/50 bg-green-50 dark:bg-green-950/30"
            >
              <h3 className="text-lg font-bold text-green-800 dark:text-green-200 mb-4">
                헤어스타일 변환 완료
              </h3>
              <HairstyleResultGallery
                faceImageUrl={result.faceImageUrl}
                resultImageUrls={result.resultImageUrls}
              />
              <Button
                onClick={handleReset}
                variant="outline"
                className="mt-4 gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 생성하기
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 폼 영역 — 제출 중이 아닐 때만 표시 */}
        {!isSubmitting && (
          <>
            {/* 카드 1: 사진 업로드 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-pink-500" />
                사진 업로드
                <span className="text-red-500 text-xs font-medium">*필수</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_60px_minmax(0,1fr)] gap-4 md:gap-0 items-stretch">
                {/* 좌: 얼굴 사진 */}
                <div className="flex flex-col items-center justify-center gap-3 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    얼굴 사진
                  </label>

                  {faceImage ? (
                    <div className="relative w-full max-w-[220px] aspect-square rounded-xl overflow-hidden group">
                      <img
                        src={faceImage.preview}
                        alt="얼굴 미리보기"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => faceInputRef.current?.click()}
                          className="text-white hover:bg-white/20"
                        >
                          <RefreshCw className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={removeFaceImage}
                          className="text-white hover:bg-white/20"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      {...faceDropZone.dragProps}
                      className="relative w-full max-w-[220px]"
                    >
                      <Button
                        variant="outline"
                        onClick={() => faceInputRef.current?.click()}
                        className={cn(
                          'w-full h-auto aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                          faceDropZone.isDragOver
                            ? 'border-pink-500 bg-pink-50 dark:bg-pink-950/20 scale-105 text-pink-500'
                            : 'border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-500 text-gray-400 hover:text-pink-500'
                        )}
                      >
                        <ImagePlus className="w-8 h-8" />
                        <span className="text-xs">
                          {faceDropZone.isDragOver ? '여기에 놓으세요' : '얼굴 사진 업로드'}
                        </span>
                      </Button>
                    </div>
                  )}

                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
                    정면 또는 약간 측면의 선명한 사진
                  </p>

                  <input
                    ref={faceInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleFaceImageSelect}
                    className="hidden"
                  />
                </div>

                {/* Mobile 화살표 */}
                <div className="flex md:hidden items-center justify-center -my-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
                    <ArrowDown className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Desktop 화살표 — 가운데 칼럼 */}
                <div className="hidden md:flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-violet-500 flex items-center justify-center shadow-lg">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* 우: 헤어스타일 선택 */}
                <div className="space-y-3 p-5 rounded-xl bg-gray-50 dark:bg-gray-800/40">
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    헤어스타일 선택
                  </label>

                  <Tabs value={hairstyleTab} onValueChange={(v) => setHairstyleTab(v as 'image' | 'text')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="image" className="gap-1.5 text-xs">
                        <ImageIcon className="w-3.5 h-3.5" />
                        이미지
                      </TabsTrigger>
                      <TabsTrigger value="text" className="gap-1.5 text-xs">
                        <Type className="w-3.5 h-3.5" />
                        텍스트
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="image" className="mt-3">
                      <div className="h-[320px] flex flex-col items-center justify-center gap-3">
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          원하는 헤어스타일 사진을 업로드하세요
                        </p>
                        {hairstyleImage ? (
                          <div className="relative w-full max-w-[220px] aspect-square rounded-xl overflow-hidden group">
                            <img
                              src={hairstyleImage.preview}
                              alt="헤어스타일 미리보기"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => hairstyleInputRef.current?.click()}
                                className="text-white hover:bg-white/20"
                              >
                                <RefreshCw className="w-5 h-5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={removeHairstyleImage}
                                className="text-white hover:bg-white/20"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            {...hairstyleDropZone.dragProps}
                            className="relative w-full max-w-[220px]"
                          >
                            <Button
                              variant="outline"
                              onClick={() => hairstyleInputRef.current?.click()}
                              className={cn(
                                'w-full h-auto aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all',
                                hairstyleDropZone.isDragOver
                                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20 scale-105 text-violet-500'
                                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 text-gray-400 hover:text-violet-500'
                              )}
                            >
                              <ImagePlus className="w-8 h-8" />
                              <span className="text-xs">
                                {hairstyleDropZone.isDragOver ? '여기에 놓으세요' : '스타일 이미지 업로드'}
                              </span>
                            </Button>
                          </div>
                        )}
                      </div>
                      <input
                        ref={hairstyleInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleHairstyleImageSelect}
                        className="hidden"
                      />
                    </TabsContent>

                    <TabsContent value="text" className="mt-3">
                      <div className="h-[320px]">
                        <Textarea
                          value={textPrompt}
                          onChange={(e) => setTextPrompt(e.target.value)}
                          placeholder="예: 짧은 픽시컷, 어깨 길이 웨이브, 금발 레이어드 컷 등"
                          className="rounded-xl resize-none h-full min-h-[280px]"
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>

            {/* 카드 2: 옵션 */}
            <div className="p-5 sm:p-6 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-4">
              {/* 변환 스타일 */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">변환 스타일</span>
                <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                  {CREATIVITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCreativityLevel(opt.value)}
                      className={cn(
                        'flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                        creativityLevel === opt.value
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 고화질 & 모자이크 */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  고화질 디테일
                </span>
                <Switch
                  checked={detailLevel === 'high'}
                  onCheckedChange={(v) => setDetailLevel(v ? 'high' : 'standard')}
                />
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={faceMosaic}
                  onCheckedChange={(v: boolean | 'indeterminate') => setFaceMosaic(!!v)}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  결과 이미지 얼굴 모자이크 처리
                </span>
              </label>

              {/* 추가 지시사항 */}
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  추가 지시사항 <span className="text-gray-400 font-normal">(선택)</span>
                </label>
                <Textarea
                  value={additionalPrompt}
                  onChange={(e) => setAdditionalPrompt(e.target.value)}
                  placeholder="포즈, 배경, 머리 색상 변경 등 자유롭게 입력"
                  rows={2}
                  className="rounded-xl resize-none"
                />
              </div>
            </div>

            {/* 카드 3: 크레딧 & 제출 */}
            <CreditFooter
              isSubmitting={isSubmitting}
              isDisabled={!faceImage || (hairstyleTab === 'image' ? !hairstyleImage : !textPrompt.trim())}
              onSubmit={handleSubmit}
            />
          </>
        )}

      </div>
    </div>
  )
}

function CreditFooter({
  isSubmitting,
  isDisabled,
  onSubmit,
}: {
  isSubmitting: boolean
  isDisabled: boolean
  onSubmit: () => void
}) {
  const { totalCredit } = useCredit()
  const cost = DEFAULT_CREDIT_SETTINGS.aiHairstylePreChargeAmount
  const isInsufficient = totalCredit < cost

  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className={cn(
        'flex items-center justify-between text-sm mb-3 px-1',
        isInsufficient ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      )}>
        <span>소요 {cost.toLocaleString()}</span>
        <span>
          잔액 {totalCredit.toLocaleString()}
          {isInsufficient && (
            <Link href="/credits" className="text-blue-500 ml-2 text-xs hover:underline">충전하기</Link>
          )}
        </span>
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting || isDisabled || isInsufficient}
        className={cn(
          'w-full h-auto py-4 rounded-xl font-semibold text-white',
          'bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500',
          'hover:from-pink-600 hover:via-rose-600 hover:to-fuchsia-600',
          'shadow-lg hover:shadow-xl hover:scale-[1.02]',
          'gap-2'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            생성 중...
          </>
        ) : isInsufficient ? (
          '크레딧이 부족합니다'
        ) : (
          <>
            <Scissors className="w-5 h-5" />
            헤어스타일 생성하기
          </>
        )}
      </Button>
    </div>
  )
}

export default function AIHairstylePageWrapper() {
  return (
    <AuthGuard>
      <div className="pb-20">
        <AIHairstylePage />
      </div>
    </AuthGuard>
  )
}
