import { z } from 'zod'
import { TimestampSchema } from './post'

/**
 * 크레딧 트랜잭션 타입
 */
export const CreditTransactionTypeSchema = z.enum([
  'credit',  // 지급 (가입, 출석, 충전, 환급, 관리자 지급, 이벤트)
  'debit',   // 차감 (선결제, 정산, 사용, 관리자 차감)
])

export type CreditTransactionType = z.infer<typeof CreditTransactionTypeSchema>

/**
 * 크레딧 트랜잭션 스키마
 * Firestore 컬렉션: credit_transactions
 */
export const CreditTransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: CreditTransactionTypeSchema,
  /** 변동량 (양수=획득, 음수=차감) */
  sCreditDelta: z.number(),
  eCreditDelta: z.number(),
  /** 트랜잭션 후 잔액 스냅샷 */
  sCreditAfter: z.number(),
  eCreditAfter: z.number(),
  description: z.string(),
  /** 관련 리소스 ID (ai_write_requests ID 등) */
  referenceId: z.string().optional(),
  /** 관련 리소스 타입 */
  referenceType: z.string().optional(),
  /** 추가 정보 (선결제 breakdown 등) */
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** 관리자 액션 시 관리자 UID */
  adminUserId: z.string().optional(),
  createdAt: TimestampSchema,
})

export type CreditTransaction = z.infer<typeof CreditTransactionSchema>

/**
 * 크레딧 설정 스키마
 * Firestore 문서: app_settings/credit_config
 */
export const CreditSettingsSchema = z.object({
  /** 가입 시 S'Credit 지급량 */
  signupGrantAmount: z.number().default(10000),
  /** 출석 체크 지급량 */
  checkinGrantAmount: z.number().default(1000),
  /** 출석 체크 S'Credit 충전 상한 */
  checkinMaxCap: z.number().default(10000),
  /** AI 글 작성 선결제 금액 */
  aiWritePreChargeAmount: z.number().default(5000),
  /** AI 채팅 메시지당 비용 */
  aiChatPerMessageCost: z.number().default(500),
  /** WordPress 발행 비용 */
  wpPublishCost: z.number().default(100),
  /** E'Credit 환율: 1원당 지급되는 E'Credit 수 */
  creditPerWon: z.number().default(5),
})

export type CreditSettings = z.infer<typeof CreditSettingsSchema>

/** 기본 크레딧 설정 */
export const DEFAULT_CREDIT_SETTINGS: CreditSettings = {
  signupGrantAmount: 10000,
  checkinGrantAmount: 1000,
  checkinMaxCap: 10000,
  aiWritePreChargeAmount: 5000,
  aiChatPerMessageCost: 500,
  wpPublishCost: 100,
  creditPerWon: 5,
}

/**
 * 선결제 정보 (AI 글 작성 시)
 */
export const PreChargeSchema = z.object({
  totalAmount: z.number(),
  sCreditCharged: z.number(),
  eCreditCharged: z.number(),
  transactionId: z.string(),
})

export type PreCharge = z.infer<typeof PreChargeSchema>

/**
 * 정산 정보 (AI 글 작성 완료/실패 시)
 */
export const SettlementSchema = z.object({
  actualCost: z.number(),
  settled: z.boolean(),
  settlementTransactionId: z.string().optional(),
})

export type Settlement = z.infer<typeof SettlementSchema>
