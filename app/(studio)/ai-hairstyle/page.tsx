'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors,
  ImagePlus,
  Loader2,
  Trash2,
  RefreshCw,
  Type,
  Image as ImageIcon,
} from 'lucide-react'
import { cn, resizeImageFile, formatRelativeTimeFns } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useCredit } from '@/context/CreditContext'
import { DEFAULT_CREDIT_SETTINGS } from '@/lib/schemas/credit'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { HairstyleResultGallery } from '@/components/ai/HairstyleResultGallery'
import { HairstyleRequestCard } from '@/components/ai/HairstyleRequestCard'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@/lib/query-client'
import type { HairstyleRequest } from '@/lib/schemas/hairstyleRequest'
import Link from 'next/link'

function AIHairstylePage() {
  // Form state
  const [faceImage, setFaceImage] = useState<{ file: File; preview: string } | null>(null)
  const [hairstyleImage, setHairstyleImage] = useState<{ file: File; preview: string } | null>(null)
  const [hairstyleTab, setHairstyleTab] = useState<string>('image')
  const [textPrompt, setTextPrompt] = useState('')
  const [additionalPrompt, setAdditionalPrompt] = useState('')
  const [faceMosaic, setFaceMosaic] = useState(false)
  const [keepOriginalFace, setKeepOriginalFace] = useState(true)

  // Result state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ faceImageUrl: string; resultImageUrls: string[] } | null>(null)

  const { authFetch } = useAuthFetch()
  const queryClient = useQueryClient()

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

  // 이력 조회
  const { data: historyData } = useQuery({
    queryKey: queryKeys.hairstyleRequests.all,
    queryFn: async () => {
      const res = await authFetch('/api/ai/hairstyle-preview?limit=20')
      if (!res.ok) throw new Error('이력 조회 실패')
      const json = await res.json()
      return json.requests as HairstyleRequest[]
    },
    staleTime: 30_000,
  })

  const visibleHistory = useMemo(() => historyData?.filter(r => !r.dismissed) ?? [], [historyData])

  // 이미지 선택 핸들러
  const handleFaceImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('jpg, png, webp 형식만 지원합니다')
      return
    }
    try {
      const resized = await resizeImageFile(file, 1024)
      if (faceImage) URL.revokeObjectURL(faceImage.preview)
      setFaceImage({ file: resized, preview: URL.createObjectURL(resized) })
      setSubmitError(null)
    } catch {
      setSubmitError('이미지 처리 중 오류가 발생했습니다')
    }
    if (faceInputRef.current) faceInputRef.current.value = ''
  }, [faceImage])

  const handleHairstyleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
      setSubmitError('jpg, png, webp 형식만 지원합니다')
      return
    }
    try {
      const resized = await resizeImageFile(file, 1024)
      if (hairstyleImage) URL.revokeObjectURL(hairstyleImage.preview)
      setHairstyleImage({ file: resized, preview: URL.createObjectURL(resized) })
      setSubmitError(null)
    } catch {
      setSubmitError('이미지 처리 중 오류가 발생했습니다')
    }
    if (hairstyleInputRef.current) hairstyleInputRef.current.value = ''
  }, [hairstyleImage])

  const removeFaceImage = useCallback(() => {
    if (faceImage) URL.revokeObjectURL(faceImage.preview)
    setFaceImage(null)
  }, [faceImage])

  const removeHairstyleImage = useCallback(() => {
    if (hairstyleImage) URL.revokeObjectURL(hairstyleImage.preview)
    setHairstyleImage(null)
  }, [hairstyleImage])

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
      formData.append('options', JSON.stringify({ faceMosaic, keepOriginalFace }))

      const res = await authFetch('/api/ai/hairstyle-preview', {
        method: 'POST',
        body: formData,
        timeout: 120_000, // 2분 (Gemini 이미지 생성 대기)
      } as RequestInit & { timeout?: number })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '요청에 실패했습니다')
      }

      setResult({
        faceImageUrl: data.faceImageUrl,
        resultImageUrls: data.resultImageUrls,
      })

      // 이력 갱신
      queryClient.invalidateQueries({ queryKey: queryKeys.hairstyleRequests.all })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }, [faceImage, hairstyleImage, hairstyleTab, textPrompt, additionalPrompt, faceMosaic, keepOriginalFace, authFetch, queryClient])

  // 다시 생성
  const handleReset = useCallback(() => {
    setResult(null)
    setSubmitError(null)
  }, [])

  // 이력 숨기기/삭제
  const handleDismiss = useCallback(async (id: string) => {
    try {
      const res = await authFetch('/api/ai/hairstyle-preview', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('숨김 처리 실패')
      queryClient.invalidateQueries({ queryKey: queryKeys.hairstyleRequests.all })
    } catch {
      setSubmitError('요청 숨김에 실패했습니다')
    }
  }, [authFetch, queryClient])

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await authFetch(`/api/ai/hairstyle-preview?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('삭제 실패')
      queryClient.invalidateQueries({ queryKey: queryKeys.hairstyleRequests.all })
    } catch {
      setSubmitError('요청 삭제에 실패했습니다')
    }
  }, [authFetch, queryClient])

  return (
    <div className="animate-in fade-in duration-500 max-w-3xl mx-auto">
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
            <motion.div
              key="loading"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-8 rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-violet-50 dark:bg-violet-950/30 text-center"
            >
              <Loader2 className="w-10 h-10 animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-violet-700 dark:text-violet-300 font-medium">
                AI가 헤어스타일을 생성하고 있어요...
              </p>
              <p className="text-violet-500 dark:text-violet-400 text-sm mt-2">
                약 30초 정도 소요됩니다
              </p>
            </motion.div>
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
            {/* 1. 얼굴 사진 업로드 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                얼굴 사진
                <span className="text-xs text-red-500">*필수</span>
              </label>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                정면 또는 약간 측면의 선명한 얼굴 사진을 업로드해주세요
              </p>

              {faceImage ? (
                <div className="relative w-40 h-40 rounded-xl overflow-hidden group">
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
                <Button
                  variant="outline"
                  onClick={() => faceInputRef.current?.click()}
                  className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-pink-400 dark:hover:border-pink-500 flex flex-col items-center justify-center text-gray-400 hover:text-pink-500 gap-2"
                >
                  <ImagePlus className="w-8 h-8" />
                  <span className="text-xs">얼굴 사진 업로드</span>
                </Button>
              )}

              <input
                ref={faceInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleFaceImageSelect}
                className="hidden"
              />
            </div>

            {/* 2. 헤어스타일 선택 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                헤어스타일 선택
              </label>

              <Tabs value={hairstyleTab} onValueChange={setHairstyleTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="image" className="gap-2">
                    <ImageIcon className="w-4 h-4" />
                    이미지로 선택
                  </TabsTrigger>
                  <TabsTrigger value="text" className="gap-2">
                    <Type className="w-4 h-4" />
                    텍스트로 설명
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="image" className="mt-3">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
                    원하는 헤어스타일이 보이는 사진을 업로드해주세요 (사람, 일러스트 등)
                  </p>
                  {hairstyleImage ? (
                    <div className="relative w-40 h-40 rounded-xl overflow-hidden group">
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
                    <Button
                      variant="outline"
                      onClick={() => hairstyleInputRef.current?.click()}
                      className="w-40 h-40 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 flex flex-col items-center justify-center text-gray-400 hover:text-violet-500 gap-2"
                    >
                      <ImagePlus className="w-8 h-8" />
                      <span className="text-xs">스타일 이미지 업로드</span>
                    </Button>
                  )}
                  <input
                    ref={hairstyleInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleHairstyleImageSelect}
                    className="hidden"
                  />
                </TabsContent>

                <TabsContent value="text" className="mt-3">
                  <Textarea
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    placeholder="예: 짧은 픽시컷, 어깨 길이 웨이브, 금발 레이어드 컷 등"
                    rows={3}
                    className="rounded-xl resize-none"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* 3. 추가 지시사항 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                추가 지시사항 <span className="text-xs text-gray-400 font-normal">(선택)</span>
              </label>
              <Textarea
                value={additionalPrompt}
                onChange={(e) => setAdditionalPrompt(e.target.value)}
                placeholder="포즈, 배경, 머리 색상 변경 등 자유롭게 입력"
                rows={2}
                className="rounded-xl resize-none"
              />
            </div>

            {/* 4. 옵션 */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                옵션
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={keepOriginalFace}
                    onCheckedChange={(v: boolean | 'indeterminate') => setKeepOriginalFace(!!v)}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    원본 얼굴 최대한 유지
                  </span>
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
              </div>
            </div>

            {/* 5. 크레딧 & 제출 */}
            <CreditFooter
              isSubmitting={isSubmitting}
              isDisabled={!faceImage || (hairstyleTab === 'image' ? !hairstyleImage : !textPrompt.trim())}
              onSubmit={handleSubmit}
            />
          </>
        )}

        {/* 6. 이력 */}
        {visibleHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Scissors className="w-4 h-4 text-pink-500" />
              요청 이력
            </h3>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {visibleHistory.map((req) => (
                  <HairstyleRequestCard
                    key={req.id}
                    request={req}
                    onDelete={handleDelete}
                    onDismiss={handleDismiss}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
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
