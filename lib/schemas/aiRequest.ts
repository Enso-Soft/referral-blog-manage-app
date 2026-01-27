import { z } from 'zod'
import { TimestampSchema } from './post'

// AI 글 작성 요청 옵션 스키마
export const AIWriteOptionsSchema = z.object({
  platform: z.enum(['tistory', 'naver', 'both']),
  tone: z.string().optional(),
  length: z.enum(['short', 'medium', 'long']).optional(),
  productIds: z.array(z.string()).optional(),
})

export type AIWriteOptions = z.infer<typeof AIWriteOptionsSchema>

// AI 글 작성 요청 상태
export type AIRequestStatus = 'pending' | 'success' | 'failed'

// AI 글 작성 요청 스키마
export const AIWriteRequestSchema = z.object({
  id: z.string(),
  userId: z.string(),
  prompt: z.string(),
  images: z.array(z.string()).default([]),
  options: AIWriteOptionsSchema,
  status: z.enum(['pending', 'success', 'failed']),
  resultPostId: z.string().optional(),
  errorMessage: z.string().optional(),
  createdAt: TimestampSchema,
  completedAt: TimestampSchema.optional(),
})

export type AIWriteRequest = z.infer<typeof AIWriteRequestSchema>

// 요청 생성용 입력 스키마
export const CreateAIWriteRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트를 입력해주세요'),
  images: z.array(z.string()).default([]),
  options: AIWriteOptionsSchema,
})

export type CreateAIWriteRequestInput = z.infer<typeof CreateAIWriteRequestSchema>

// 대화 메시지 스키마
export const ConversationMessageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  status: z.enum(['pending', 'success', 'failed']),
  createdAt: TimestampSchema,
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

// 톤 옵션 상수
export const TONE_OPTIONS = [
  { value: 'friendly', label: '친근하고 설명적' },
  { value: 'professional', label: '전문적이고 신뢰감 있는' },
  { value: 'casual', label: '캐주얼하고 재미있는' },
  { value: 'concise', label: '간결하고 핵심만' },
  { value: 'custom', label: '직접 입력' },
] as const

// 길이 옵션 상수
export const LENGTH_OPTIONS = [
  { value: 'short', label: '짧게 (~1500자)' },
  { value: 'medium', label: '보통 (2000~3000자)' },
  { value: 'long', label: '길게 (3500자~)' },
] as const

// 플랫폼 옵션 상수
export const PLATFORM_OPTIONS = [
  { value: 'tistory', label: 'Tistory' },
  { value: 'naver', label: 'Naver' },
  { value: 'both', label: 'Both' },
] as const
