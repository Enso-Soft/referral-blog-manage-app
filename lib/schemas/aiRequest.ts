import { z } from 'zod'
import { TimestampSchema } from './post'

/**
 * ============================================================================
 * AI 블로그 작성 기능 - Firestore 스키마 문서
 * ============================================================================
 *
 * 이 파일은 AI 블로그 작성 기능에서 사용하는 Firestore 스키마를 정의합니다.
 * 서버 개발자는 아래 스키마를 참고하여 Firestore 문서를 업데이트해주세요.
 *
 * ============================================================================
 * [컬렉션 1] ai_write_requests
 * ============================================================================
 *
 * 경로: /ai_write_requests/{requestId}
 * 설명: AI 블로그 글 작성 요청 정보를 저장하는 컬렉션
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 필드명          │ 타입              │ 필수 │ 설명                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ userId          │ string            │ ✅   │ Firebase Auth UID           │
 * │ userEmail       │ string            │ ✅   │ 사용자 이메일               │
 * │ prompt          │ string            │ ✅   │ 사용자가 입력한 프롬프트    │
 * │ images          │ string[]          │ ✅   │ Base64 이미지 배열          │
 * │                 │                   │      │ (data:image/jpeg;base64,...) │
 * │ options         │ object            │ ✅   │ 작성 옵션 (아래 상세 참고)  │
 * │ status          │ string            │ ✅   │ 'pending'|'success'|'failed'│
 * │ resultPostId    │ string | null     │ ❌   │ 생성된 블로그 글 ID         │
 * │ errorMessage    │ string | null     │ ❌   │ 실패 시 에러 메시지         │
 * │ progressMessage │ string | null     │ ❌   │ 진행 상태 메시지 (최신 1건) │
 * │                 │                   │      │ (pending 중 세부 진행 표시) │
 * │ progressMessages│ array             │ ❌   │ 진행 메시지 누적 배열       │
 * │                 │                   │      │ [{message, timestamp}, ...] │
 * │ createdAt       │ Timestamp         │ ✅   │ 요청 생성 시간              │
 * │ completedAt     │ Timestamp | null  │ ❌   │ 작업 완료 시간              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * [options 필드 상세]
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 필드명          │ 타입              │ 필수 │ 설명                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ platform        │ string            │ ❌   │ 'tistory'|'naver'|'both'    │
 * │ tone            │ string | null     │ ❌   │ 글 톤 (아래 TONE_OPTIONS)   │
 * │                 │                   │      │ 'auto'면 AI가 알아서 판단   │
 * │ length          │ string | null     │ ❌   │ 'auto'|'short'|'medium'|    │
 * │                 │                   │      │ 'long' (auto=AI 판단)       │
 * │ productIds      │ string[] | null   │ ❌   │ 연동할 제품 ID 배열         │
 * │                 │                   │      │ (products 컬렉션의 문서 ID) │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * [상태(status) 흐름]
 *
 *   ┌──────────┐      AI API 호출 성공       ┌──────────┐
 *   │ pending  │ ─────────────────────────→  │ pending  │ (상태 유지)
 *   └──────────┘                             └──────────┘
 *        │                                        │
 *        │ AI API 호출 실패                       │ AI 서버 작업 완료
 *        ▼                                        ▼
 *   ┌──────────┐                             ┌──────────┐
 *   │  failed  │                             │ success  │
 *   └──────────┘                             └──────────┘
 *
 * [AI 서버가 업데이트해야 할 필드] ⚠️ 중요
 *
 * 작업 성공 시:
 *   - status: 'success'
 *   - resultPostId: 생성된 blog_posts 문서 ID (선택)
 *   - completedAt: Firestore Timestamp (서버 시간)
 *
 * 작업 실패 시:
 *   - status: 'failed'
 *   - errorMessage: 실패 사유 문자열
 *   - completedAt: Firestore Timestamp (서버 시간)
 *
 * ============================================================================
 * [컬렉션 2] blog_posts (AI가 생성한 글 저장용)
 * ============================================================================
 *
 * 경로: /blog_posts/{postId}
 * 설명: 블로그 글을 저장하는 컬렉션 (기존 컬렉션에 AI가 글 추가)
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 필드명          │ 타입              │ 필수 │ 설명                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ userId          │ string            │ ✅   │ Firebase Auth UID           │
 * │ title           │ string            │ ✅   │ 글 제목                     │
 * │ content         │ string            │ ✅   │ HTML 형식의 글 본문         │
 * │ excerpt         │ string            │ ✅   │ 요약/발췌문 (미리보기용)    │
 * │ thumbnail       │ string            │ ❌   │ 썸네일 이미지 URL           │
 * │ keywords        │ string[]          │ ✅   │ 키워드/태그 배열            │
 * │ status          │ string            │ ✅   │ 'draft' | 'published'       │
 * │ platform        │ string            │ ❌   │ 'tistory'|'naver'|'both'    │
 * │ createdAt       │ Timestamp         │ ✅   │ 생성 시간                   │
 * │ updatedAt       │ Timestamp         │ ✅   │ 수정 시간                   │
 * │ metadata        │ object            │ ❌   │ 추가 메타데이터             │
 * │   └ wordCount   │ number            │ ❌   │ 글자 수                     │
 * │   └ aiGenerated │ boolean           │ ❌   │ AI 생성 여부 (true)         │
 * │   └ aiRequestId │ string            │ ❌   │ ai_write_requests 문서 ID   │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * ============================================================================
 */

// AI 글 작성 요청 옵션 스키마
export const AIWriteOptionsSchema = z.object({
  /** 타겟 플랫폼: 'tistory' | 'naver' | 'both' (옵션) */
  platform: z.enum(['tistory', 'naver', 'both']).optional(),
  /**
   * 글 톤/스타일
   * - 'auto': AI가 알아서 판단
   * - 'friendly': 친근하고 설명적
   * - 'professional': 전문적이고 신뢰감 있는
   * - 'casual': 캐주얼하고 재미있는
   * - 'concise': 간결하고 핵심만
   * - 또는 사용자가 직접 입력한 문자열
   */
  tone: z.string().optional(),
  /**
   * 글 길이
   * - 'auto': AI가 알아서 판단
   * - 'short': 짧게 (~1500자)
   * - 'medium': 보통 (2000~3000자)
   * - 'long': 길게 (3500자~)
   */
  length: z.enum(['auto', 'short', 'medium', 'long']).optional(),
  /** 연동할 제품 ID 배열 (products 컬렉션의 문서 ID) */
  productIds: z.array(z.string()).optional(),
})

export type AIWriteOptions = z.infer<typeof AIWriteOptionsSchema>

/**
 * AI 글 작성 요청 상태
 * - 'pending': 진행 중 (AI가 작업 중)
 * - 'success': 완료 (글 생성 성공)
 * - 'failed': 실패
 */
export type AIRequestStatus = 'pending' | 'success' | 'failed'

/**
 * AI 글 작성 요청 스키마
 * Firestore 컬렉션: ai_write_requests
 */
export const AIWriteRequestSchema = z.object({
  /** 문서 ID (Firestore auto-generated) */
  id: z.string(),
  /** Firebase Auth UID */
  userId: z.string(),
  /** 사용자가 입력한 프롬프트 */
  prompt: z.string(),
  /** Base64 인코딩된 이미지 배열 (data:image/jpeg;base64,...) */
  images: z.array(z.string()).default([]),
  /** 작성 옵션 */
  options: AIWriteOptionsSchema,
  /**
   * 요청 상태
   * - 'pending': 진행 중 (AI가 작업 중)
   * - 'success': 완료 (AI 서버가 업데이트)
   * - 'failed': 실패
   */
  status: z.enum(['pending', 'success', 'failed']),
  /** 생성된 blog_posts 문서 ID (성공 시, AI 서버가 업데이트) */
  resultPostId: z.string().optional(),
  /** 에러 메시지 (실패 시, AI 서버가 업데이트) */
  errorMessage: z.string().optional(),
  /** 진행 상태 메시지 — 최신 1건 (pending 중 세부 진행 표시, AI 서버가 업데이트) */
  progressMessage: z.string().optional(),
  /** 진행 상태 메시지 누적 배열 (API에서 progressMessage 업데이트 시 자동 누적, 타임스탬프 포함) */
  progressMessages: z.array(z.object({
    message: z.string(),
    timestamp: TimestampSchema,
  })).optional(),
  /** 요청 생성 시간 (웹앱에서 설정) */
  createdAt: TimestampSchema,
  /** 작업 완료 시간 (AI 서버가 업데이트) */
  completedAt: TimestampSchema.optional(),
  /** 카드 숨김 여부 (사용자가 X 버튼 클릭 시 true) */
  dismissed: z.boolean().optional(),
})

export type AIWriteRequest = z.infer<typeof AIWriteRequestSchema>

// 요청 생성용 입력 스키마 (웹앱 내부용)
export const CreateAIWriteRequestSchema = z.object({
  prompt: z.string().min(1, '프롬프트를 입력해주세요'),
  images: z.array(z.string()).default([]),
  options: AIWriteOptionsSchema,
})

export type CreateAIWriteRequestInput = z.infer<typeof CreateAIWriteRequestSchema>

/**
 * ============================================================================
 * [서브컬렉션] blog_posts/{postId}/conversations
 * ============================================================================
 *
 * 경로: /blog_posts/{postId}/conversations/{messageId}
 * 설명: 기존 글을 AI와 대화하며 수정할 때 사용하는 대화 이력
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ 필드명          │ 타입              │ 필수 │ 설명                        │
 * ├─────────────────────────────────────────────────────────────────────────┤
 * │ role            │ string            │ ✅   │ 'user' | 'assistant'        │
 * │ content         │ string            │ ✅   │ 메시지 내용                 │
 * │ status          │ string            │ ✅   │ 'pending'|'success'|'failed'│
 * │ createdAt       │ Timestamp         │ ✅   │ 메시지 생성 시간            │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * [AI 서버가 할 일]
 * 1. 사용자 메시지(role='user', status='pending')를 감지
 * 2. AI 응답 생성 후:
 *    - 새 문서 추가: role='assistant', content=AI응답, status='success'
 *    - (선택) blog_posts/{postId}의 content 필드 업데이트 (글 내용 수정 시)
 *    - 사용자 메시지의 status를 'success'로 업데이트
 *
 * ============================================================================
 */

/**
 * 대화 메시지 스키마
 * Firestore 서브컬렉션: blog_posts/{postId}/conversations
 */
export const ConversationMessageSchema = z.object({
  /** 문서 ID */
  id: z.string(),
  /** 메시지 작성자: 'user' (사용자) | 'assistant' (AI) */
  role: z.enum(['user', 'assistant']),
  /** 메시지 내용 */
  content: z.string(),
  /**
   * 메시지 상태
   * - 'pending': 처리 중 (AI 응답 대기)
   * - 'success': 완료
   * - 'failed': 실패
   */
  status: z.enum(['pending', 'success', 'failed']),
  /** 메시지 생성 시간 */
  createdAt: TimestampSchema,
})

export type ConversationMessage = z.infer<typeof ConversationMessageSchema>

// 톤 옵션 상수
export const TONE_OPTIONS = [
  { value: 'auto', label: 'AI에게 맡기기' },
  { value: 'friendly', label: '친근하고 설명적' },
  { value: 'professional', label: '전문적이고 신뢰감 있는' },
  { value: 'casual', label: '캐주얼하고 재미있는' },
  { value: 'concise', label: '간결하고 핵심만' },
  { value: 'custom', label: '직접 입력' },
] as const

// 길이 옵션 상수
export const LENGTH_OPTIONS = [
  { value: 'auto', label: 'AI에게 맡기기' },
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
