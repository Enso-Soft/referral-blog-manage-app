import 'server-only'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { TTLCache } from '@/lib/cache'
import { logger } from '@/lib/logger'
import { AppError } from '@/lib/errors'
import {
  type CreditTransactionType,
  type CreditSettings,
  DEFAULT_CREDIT_SETTINGS,
} from '@/lib/schemas/credit'

// 크레딧 설정 캐시 (5분)
const settingsCache = new TTLCache<CreditSettings>(5 * 60 * 1000, 10)

/**
 * 관리자 크레딧 설정 조회 (5분 캐시)
 */
export async function getCreditSettings(): Promise<CreditSettings> {
  const cached = settingsCache.get('credit_config')
  if (cached) return cached

  const db = getDb()
  const doc = await db.collection('app_settings').doc('credit_config').get()

  const data = (doc.exists
    ? { ...DEFAULT_CREDIT_SETTINGS, ...doc.data() }
    : DEFAULT_CREDIT_SETTINGS) as CreditSettings

  settingsCache.set('credit_config', data)
  return data
}

/** 설정 캐시 무효화 */
export function invalidateCreditSettingsCache() {
  settingsCache.delete('credit_config')
}

interface DeductResult {
  transactionId: string
  sCreditUsed: number
  eCreditUsed: number
  sCreditAfter: number
  eCreditAfter: number
}

/**
 * 크레딧 차감 (S'Credit 우선 → E'Credit)
 * Firestore runTransaction으로 원자적 처리
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: CreditTransactionType,
  description: string,
  referenceId?: string,
  referenceType?: string,
  metadata?: Record<string, unknown>
): Promise<DeductResult> {
  if (amount <= 0) {
    throw new Error('차감 금액은 양수여야 합니다')
  }

  const db = getDb()
  const userRef = db.collection('users').doc(userId)
  const txnRef = db.collection('credit_transactions').doc()

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    if (!userDoc.exists) {
      throw new Error('사용자를 찾을 수 없습니다')
    }

    const userData = userDoc.data()!
    const sCredit = userData.sCredit ?? 0
    const eCredit = userData.eCredit ?? 0
    const totalCredit = sCredit + eCredit

    if (totalCredit < amount) {
      throw new AppError('크레딧이 부족합니다', 'INSUFFICIENT_CREDIT', 402)
    }

    const sCreditUsed = Math.min(sCredit, amount)
    const eCreditUsed = amount - sCreditUsed
    const newSCredit = sCredit - sCreditUsed
    const newECredit = eCredit - eCreditUsed

    transaction.update(userRef, {
      sCredit: newSCredit,
      eCredit: newECredit,
    })

    const txnData: Record<string, unknown> = {
      userId,
      type,
      sCreditDelta: -sCreditUsed,
      eCreditDelta: -eCreditUsed,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
      description,
      createdAt: Timestamp.now(),
    }
    if (referenceId) txnData.referenceId = referenceId
    if (referenceType) txnData.referenceType = referenceType
    if (metadata) txnData.metadata = metadata

    transaction.set(txnRef, txnData)

    return {
      transactionId: txnRef.id,
      sCreditUsed,
      eCreditUsed,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
    }
  })

  return result
}

interface AdminDeductResult {
  transactionId: string
  sCreditAfter: number
  eCreditAfter: number
}

/**
 * 관리자 S/E 개별 차감
 * S와 E를 각각 독립적으로 차감하여 관리자 의도대로 제어
 */
export async function adminDeductCredits(
  userId: string,
  sDeduct: number,
  eDeduct: number,
  description: string,
  adminUserId: string
): Promise<AdminDeductResult> {
  if (sDeduct < 0 || eDeduct < 0) {
    throw new Error('차감 금액은 0 이상이어야 합니다')
  }
  if (sDeduct === 0 && eDeduct === 0) {
    throw new Error('차감 금액이 0입니다')
  }

  const db = getDb()
  const userRef = db.collection('users').doc(userId)
  const txnRef = db.collection('credit_transactions').doc()

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    if (!userDoc.exists) {
      throw new Error('사용자를 찾을 수 없습니다')
    }

    const userData = userDoc.data()!
    const sCredit = userData.sCredit ?? 0
    const eCredit = userData.eCredit ?? 0

    if (sDeduct > 0 && sCredit < sDeduct) {
      throw new AppError(`S'Credit이 부족합니다 (보유: ${sCredit}, 차감: ${sDeduct})`, 'INSUFFICIENT_CREDIT', 402)
    }
    if (eDeduct > 0 && eCredit < eDeduct) {
      throw new AppError(`E'Credit이 부족합니다 (보유: ${eCredit}, 차감: ${eDeduct})`, 'INSUFFICIENT_CREDIT', 402)
    }

    const newSCredit = sCredit - sDeduct
    const newECredit = eCredit - eDeduct

    transaction.update(userRef, {
      sCredit: newSCredit,
      eCredit: newECredit,
    })

    transaction.set(txnRef, {
      userId,
      type: 'debit',
      sCreditDelta: -sDeduct,
      eCreditDelta: -eDeduct,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
      description,
      adminUserId,
      createdAt: Timestamp.now(),
    })

    return {
      transactionId: txnRef.id,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
    }
  })

  return result
}

interface RefundResult {
  transactionId: string
  sCreditAfter: number
  eCreditAfter: number
}

/**
 * 크레딧 환급 (전달받은 S/E 금액 그대로 복원)
 * S'Credit 상한 무시 (출첵 충전에만 상한 적용)
 */
export async function refundCredits(
  userId: string,
  sToRefund: number,
  eToRefund: number,
  type: CreditTransactionType,
  description: string,
  referenceId?: string,
  referenceType?: string,
  metadata?: Record<string, unknown>
): Promise<RefundResult> {
  if (sToRefund < 0 || eToRefund < 0) {
    throw new Error('환급 금액은 0 이상이어야 합니다')
  }
  if (sToRefund === 0 && eToRefund === 0) {
    throw new Error('환급 금액이 0입니다')
  }

  const db = getDb()
  const userRef = db.collection('users').doc(userId)
  const txnRef = db.collection('credit_transactions').doc()

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    if (!userDoc.exists) {
      throw new Error('사용자를 찾을 수 없습니다')
    }

    const userData = userDoc.data()!
    const sCredit = userData.sCredit ?? 0
    const eCredit = userData.eCredit ?? 0
    const newSCredit = sCredit + sToRefund
    const newECredit = eCredit + eToRefund

    transaction.update(userRef, {
      sCredit: newSCredit,
      eCredit: newECredit,
    })

    const txnData: Record<string, unknown> = {
      userId,
      type,
      sCreditDelta: sToRefund,
      eCreditDelta: eToRefund,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
      description,
      createdAt: Timestamp.now(),
    }
    if (referenceId) txnData.referenceId = referenceId
    if (referenceType) txnData.referenceType = referenceType
    if (metadata) txnData.metadata = metadata

    transaction.set(txnRef, txnData)

    return {
      transactionId: txnRef.id,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
    }
  })

  return result
}

interface GrantResult {
  transactionId: string
  sCreditAfter: number
  eCreditAfter: number
}

/**
 * 크레딧 지급
 */
export async function grantCredits(
  userId: string,
  sAmount: number,
  eAmount: number,
  type: CreditTransactionType,
  description: string,
  referenceId?: string,
  referenceType?: string,
  adminUserId?: string,
  metadata?: Record<string, unknown>
): Promise<GrantResult> {
  if (sAmount < 0 || eAmount < 0) {
    throw new Error('지급 금액은 0 이상이어야 합니다')
  }
  if (sAmount === 0 && eAmount === 0) {
    throw new Error('지급 금액이 0입니다')
  }

  const db = getDb()
  const userRef = db.collection('users').doc(userId)
  const txnRef = db.collection('credit_transactions').doc()

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef)
    if (!userDoc.exists) {
      throw new Error('사용자를 찾을 수 없습니다')
    }

    const userData = userDoc.data()!
    const sCredit = userData.sCredit ?? 0
    const eCredit = userData.eCredit ?? 0
    const newSCredit = sCredit + sAmount
    const newECredit = eCredit + eAmount

    transaction.update(userRef, {
      sCredit: newSCredit,
      eCredit: newECredit,
    })

    const txnData: Record<string, unknown> = {
      userId,
      type,
      sCreditDelta: sAmount,
      eCreditDelta: eAmount,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
      description,
      createdAt: Timestamp.now(),
    }
    if (referenceId) txnData.referenceId = referenceId
    if (referenceType) txnData.referenceType = referenceType
    if (adminUserId) txnData.adminUserId = adminUserId
    if (metadata) txnData.metadata = metadata

    transaction.set(txnRef, txnData)

    return {
      transactionId: txnRef.id,
      sCreditAfter: newSCredit,
      eCreditAfter: newECredit,
    }
  })

  return result
}

/**
 * AI 요청 정산
 * - 이미 settled면 스킵 (멱등성)
 * - failed → 전액 환급
 * - success + actual > pre → 추가 차감 (잔액 부족 시 가능한 만큼만)
 * - success + actual < pre → 차액 환급 (비례 계산)
 * - success + actual == pre → 정산 불필요
 */
export async function settleAIRequest(
  requestId: string,
  actualCost: number,
  status: 'success' | 'failed',
  collectionName: string = 'ai_write_requests',
  referenceType: string = 'ai_write_request',
  descriptionPrefix: string = 'AI 글 작성'
): Promise<void> {
  const db = getDb()
  const requestRef = db.collection(collectionName).doc(requestId)
  const requestDoc = await requestRef.get()

  if (!requestDoc.exists) {
    logger.error(`[Credit] AI 요청 ${requestId}을 찾을 수 없습니다`)
    return
  }

  const data = requestDoc.data()!

  // 선결제 정보 없으면 스킵
  if (!data.preCharge) {
    return
  }

  // 이미 정산됐으면 스킵 (멱등성)
  if (data.settlement?.settled) {
    return
  }

  const { totalAmount, sCreditCharged, eCreditCharged, transactionId: preChargeTxnId } = data.preCharge
  const userId = data.userId

  if (status === 'failed') {
    // 전액 환급
    const result = await refundCredits(
      userId,
      sCreditCharged,
      eCreditCharged,
      'credit',
      `${descriptionPrefix} 실패 - ${totalAmount.toLocaleString()} 전액 환급`,
      requestId,
      referenceType,
      { preChargeTransactionId: preChargeTxnId }
    )

    await requestRef.update({
      settlement: {
        actualCost: 0,
        settled: true,
        settlementTransactionId: result.transactionId,
      },
    })
    return
  }

  // success
  const diff = actualCost - totalAmount

  if (diff === 0) {
    // 선결제 금액 == 실제 금액: 정산 불필요
    await requestRef.update({
      settlement: {
        actualCost,
        settled: true,
      },
    })
    return
  }

  if (diff > 0) {
    // 추가 차감 필요
    try {
      const result = await deductCredits(
        userId,
        diff,
        'debit',
        `${descriptionPrefix} 정산 - ${diff.toLocaleString()} 추가 차감`,
        requestId,
        referenceType,
        { preChargeTransactionId: preChargeTxnId, preChargeAmount: totalAmount, actualCost }
      )

      await requestRef.update({
        settlement: {
          actualCost,
          settled: true,
          settlementTransactionId: result.transactionId,
        },
      })
    } catch (err: unknown) {
      if (err instanceof AppError && err.code === 'INSUFFICIENT_CREDIT') {
        // 잔액 부족 시 가능한 만큼만 차감
        const userRef = db.collection('users').doc(userId)
        const userDoc = await userRef.get()
        const userData = userDoc.data()!
        const available = (userData.sCredit ?? 0) + (userData.eCredit ?? 0)

        if (available > 0) {
          const partialAmount = Math.min(available, diff)
          const result = await deductCredits(
            userId,
            partialAmount,
            'debit',
            `${descriptionPrefix} 정산 - ${partialAmount.toLocaleString()}/${diff.toLocaleString()} 부분 차감`,
            requestId,
            referenceType,
            { preChargeTransactionId: preChargeTxnId, shortfall: diff - partialAmount }
          )

          await requestRef.update({
            settlement: {
              actualCost,
              settled: true,
              settlementTransactionId: result.transactionId,
            },
          })
        } else {
          // 잔액 0: 0원 트랜잭션이라도 감사 추적용으로 기록
          const zeroTxnRef = db.collection('credit_transactions').doc()
          await zeroTxnRef.set({
            userId,
            type: 'debit',
            sCreditDelta: 0,
            eCreditDelta: 0,
            sCreditAfter: 0,
            eCreditAfter: 0,
            description: `${descriptionPrefix} 정산 - 잔액 부족 (미회수 ${diff.toLocaleString()})`,
            referenceId: requestId,
            referenceType,
            metadata: { shortfall: diff, preChargeTransactionId: preChargeTxnId },
            createdAt: Timestamp.now(),
          })

          await requestRef.update({
            settlement: {
              actualCost,
              settled: true,
              settlementTransactionId: zeroTxnRef.id,
            },
          })
          logger.warn(`[Credit] AI 요청 ${requestId} 정산 부족분: ${diff}`)
        }
      } else {
        throw err
      }
    }
    return
  }

  // diff < 0: 차액 환급 (비례 계산)
  const refundAmount = Math.abs(diff)
  // E'Credit 환급 우선 (역순): eRefund = min(eCreditCharged, refundAmount)
  const eRefund = Math.min(eCreditCharged, refundAmount)
  const sRefund = refundAmount - eRefund

  const result = await refundCredits(
    userId,
    sRefund,
    eRefund,
    'credit',
    `${descriptionPrefix} 정산 - ${refundAmount.toLocaleString()} 차액 환급`,
    requestId,
    referenceType,
    { preChargeTransactionId: preChargeTxnId, preChargeAmount: totalAmount, actualCost }
  )

  await requestRef.update({
    settlement: {
      actualCost,
      settled: true,
      settlementTransactionId: result.transactionId,
    },
  })
}

/**
 * 잔액 무결성 검증: 트랜잭션 로그 합산 vs 저장 잔액 비교
 * 배치 처리로 대량 트랜잭션 대응 (500건씩 조회)
 */
export async function checkBalanceIntegrity(userId: string): Promise<{
  isValid: boolean
  stored: { sCredit: number; eCredit: number }
  calculated: { sCredit: number; eCredit: number }
  transactionCount: number
}> {
  const db = getDb()

  const userDoc = await db.collection('users').doc(userId).get()
  if (!userDoc.exists) {
    throw new Error('사용자를 찾을 수 없습니다')
  }

  const userData = userDoc.data()!
  const storedS = userData.sCredit ?? 0
  const storedE = userData.eCredit ?? 0

  // 배치 처리로 트랜잭션 로그 집계
  let calcS = 0
  let calcE = 0
  let count = 0
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined

  do {
    let query = db.collection('credit_transactions')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'asc')
      .limit(500)
    if (lastDoc) query = query.startAfter(lastDoc)

    const batch = await query.get()
    batch.forEach((doc) => {
      const data = doc.data()
      calcS += data.sCreditDelta ?? 0
      calcE += data.eCreditDelta ?? 0
      count++
    })
    lastDoc = batch.docs.length > 0 ? batch.docs[batch.docs.length - 1] : undefined
  } while (lastDoc)

  return {
    isValid: storedS === calcS && storedE === calcE,
    stored: { sCredit: storedS, eCredit: storedE },
    calculated: { sCredit: calcS, eCredit: calcE },
    transactionCount: count,
  }
}
