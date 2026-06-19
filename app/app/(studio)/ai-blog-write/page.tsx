'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  ImagePlus,
  Loader2,
  Trash2,
} from 'lucide-react'
import { cn, resizeImageFile } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAuthFetch } from '@/hooks/useAuthFetch'
import { useCredit } from '@/context/CreditContext'
import {
  type AIWriteOptions,
} from '@/lib/schemas/aiRequest'
import { DEFAULT_CREDIT_SETTINGS } from '@/lib/schemas/credit'
import { ProductCombobox } from '@/components/product/ProductCombobox'
import { AuthGuard } from '@/components/layout/AuthGuard'
import Link from 'next/link'

interface SelectedProduct {
  id: string
  name: string
  affiliateLink: string
}

const MAX_IMAGES = 10

function AIWritePage() {
  // Form state
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const { authFetch } = useAuthFetch()

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imagesRef = useRef(images)
  imagesRef.current = images

  // unmount 시 이미지 objectURL 정리
  useEffect(() => {
    return () => {
      imagesRef.current.forEach(img => URL.revokeObjectURL(img.preview))
    }
  }, [])

  // textarea 자동 높이 조절
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxH = window.innerWidth < 640 ? window.innerHeight * 0.4 : 400
    const clamped = Math.min(el.scrollHeight, maxH)
    el.style.height = `${clamped}px`
    el.style.overflowY = el.scrollHeight > maxH ? 'auto' : 'hidden'
  }, [prompt])

  // 이미지 선택 핸들러
  const handleImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const validFiles: { file: File; preview: string }[] = []

    for (const file of files) {
      if (images.length + validFiles.length >= MAX_IMAGES) break
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        setSubmitError('jpg, jpeg, png, webp 형식만 지원합니다')
        continue
      }
      try {
        const resized = await resizeImageFile(file, 1920)
        validFiles.push({
          file: resized,
          preview: URL.createObjectURL(resized),
        })
      } catch {
        setSubmitError('이미지 처리 중 오류가 발생했습니다')
      }
    }

    setImages(prev => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [images.length])

  // 이미지 제거
  const removeImage = useCallback((index: number) => {
    setImages(prev => {
      const removed = prev[index]
      URL.revokeObjectURL(removed.preview)
      return prev.filter((_, i) => i !== index)
    })
  }, [])

  // 제품 선택 핸들러
  const handleProductSelect = useCallback((product: { id: string; name: string; affiliateLink: string }) => {
    setSelectedProducts(prev => {
      if (prev.some(p => p.affiliateLink === product.affiliateLink)) return prev
      return [...prev, product]
    })
  }, [])

  // 제품 제거
  const removeProduct = useCallback((id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id))
  }, [])

  // 폼 리셋
  const resetForm = useCallback(() => {
    setPrompt('')
    setImages(prev => {
      prev.forEach(img => URL.revokeObjectURL(img.preview))
      return []
    })
    setSelectedProducts([])
    setSubmitError(null)
  }, [])

  // 폼 제출
  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      setSubmitError('프롬프트를 입력해주세요')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const formData = new FormData()
      formData.append('prompt', prompt.trim())
      formData.append('options', JSON.stringify({
        productIds: selectedProducts.map(p => p.affiliateLink),
      } as AIWriteOptions))

      images.forEach((img, i) => {
        formData.append(`image_${i}`, img.file)
      })

      const res = await authFetch('/api/ai/blog-writer', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || data.message || '요청에 실패했습니다')
      }

      resetForm()
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : '요청 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }, [prompt, selectedProducts, images, authFetch, resetForm])

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto">
      {/* 페이지 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
              AI 블로그 작성
            </h1>
            <p className="text-muted-foreground mt-1 text-lg">
              프롬프트로 블로그 글을 자동 생성합니다
            </p>
          </div>
        </div>
      </div>

      {/* 작성 폼 */}
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

        {/* 프롬프트 입력 */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-lg">📝</span>
            프롬프트 입력
          </label>
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && prompt.trim() && !isSubmitting) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="어떤 블로그 글을 작성할까요?"
              rows={8}
              className="rounded-xl resize-none min-h-[200px]"
            />
            {prompt.length > 0 && (
              <div className="mt-1.5 px-1">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {prompt.length}자
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 이미지 첨부 */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-lg">🖼️</span>
            이미지 첨부
            <span className="text-xs text-gray-400">
              ({images.length}/{MAX_IMAGES})
            </span>
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            첨부한 이미지는 AI가 글에 직접 사용하거나, 참고하여 이미지를 생성하는 데 활용됩니다.
          </p>

          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative w-20 h-20 rounded-xl overflow-hidden group"
              >
                <img
                  src={img.preview}
                  alt={`Preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeImage(idx)}
                  className="absolute inset-0 w-full h-full bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-none hover:bg-black/60"
                >
                  <Trash2 className="w-5 h-5 text-white" />
                </Button>
              </div>
            ))}

            {images.length < MAX_IMAGES && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 flex items-center justify-center text-gray-400 hover:text-violet-500"
              >
                <ImagePlus className="w-6 h-6" />
              </Button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>

        {/* 제품 연동 — 처음부터 펼침 */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <span className="text-lg">🛒</span>
            제품 연동
          </label>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            쿠팡 파트너스/네이버 커넥트의 제휴 링크를 프롬프트에 직접 입력해도 AI가 자동으로 인식합니다.
          </p>
          <ProductCombobox
            selectedProducts={selectedProducts}
            onSelect={handleProductSelect}
            onRemove={removeProduct}
            maxSelections={10}
          />
        </div>

        {/* 제출 Footer */}
        <CreditFooter
          isSubmitting={isSubmitting}
          isPromptEmpty={!prompt.trim()}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}

/** 비용/잔액 표시가 포함된 제출 Footer */
function CreditFooter({
  isSubmitting,
  isPromptEmpty,
  onSubmit,
}: {
  isSubmitting: boolean
  isPromptEmpty: boolean
  onSubmit: () => void
}) {
  const { totalCredit } = useCredit()
  const cost = DEFAULT_CREDIT_SETTINGS.aiWritePreChargeAmount
  const isInsufficient = totalCredit < cost

  return (
    <div className="p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      {/* 비용/잔액 라인 */}
      <div className={cn(
        'flex items-center justify-between text-sm mb-3 px-1',
        isInsufficient ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
      )}>
        <span>소요 {cost.toLocaleString()}</span>
        <span>
          잔액 {totalCredit.toLocaleString()}
          {isInsufficient && (
            <Link href="/app/credits" className="text-blue-500 ml-2 text-xs hover:underline">충전하기</Link>
          )}
        </span>
      </div>

      <Button
        onClick={onSubmit}
        disabled={isSubmitting || isPromptEmpty || isInsufficient}
        className={cn(
          'w-full h-auto py-4 rounded-xl font-semibold text-white',
          'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500',
          'hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-600',
          'shadow-lg hover:shadow-xl hover:scale-[1.02]',
          'gap-2'
        )}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            AI 서버에 요청 전달 중...
          </>
        ) : isInsufficient ? (
          '크레딧이 부족합니다'
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            요청하기
            <span className="text-xs opacity-70 ml-1">⌘↵</span>
          </>
        )}
      </Button>
    </div>
  )
}

export default function AIWritePageWrapper() {
  return (
    <AuthGuard>
      <div className="pb-20">
        <AIWritePage />
      </div>
    </AuthGuard>
  )
}
