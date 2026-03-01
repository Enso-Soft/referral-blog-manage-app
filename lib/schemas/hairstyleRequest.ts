import { z } from 'zod'
import { TimestampSchema } from './post'

/**
 * AI 헤어스타일 미리보기 - Firestore 스키마
 * 컬렉션: ai_hairstyle_requests
 */

export const HairstyleOptionsSchema = z.object({
  /** 결과 이미지 얼굴 모자이크 처리 */
  faceMosaic: z.boolean().default(false),
  /** 창의성 수준 */
  creativityLevel: z.enum(['strict', 'balanced', 'creative']).default('balanced'),
})

export type HairstyleOptions = z.infer<typeof HairstyleOptionsSchema>

export const HairstyleRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userEmail: z.string(),
  /** 얼굴 이미지 S3 URL (필수) */
  faceImageUrl: z.string(),
  /** 헤어스타일 참조 이미지 S3 URL (선택) */
  hairstyleImageUrl: z.string().optional(),
  /** 텍스트 프롬프트 (선택) */
  prompt: z.string().optional(),
  /** 추가 지시사항 */
  additionalPrompt: z.string().optional(),
  options: HairstyleOptionsSchema,
  status: z.enum(['pending', 'success', 'failed']),
  /** 생성된 결과 이미지 S3 URL 배열 */
  resultImageUrls: z.array(z.string()).optional(),
  errorMessage: z.string().optional(),
  createdAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
  dismissed: z.boolean().optional(),
  /** 크레딧 선결제 정보 */
  preCharge: z.object({
    totalAmount: z.number(),
    sCreditCharged: z.number(),
    eCreditCharged: z.number(),
    transactionId: z.string(),
  }).optional(),
  /** 크레딧 정산 정보 */
  settlement: z.object({
    actualCost: z.number(),
    settled: z.boolean(),
    settlementTransactionId: z.string().optional(),
  }).optional(),
})

export type HairstyleRequest = z.infer<typeof HairstyleRequestSchema>
