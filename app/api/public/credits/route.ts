import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { deductCredits } from '@/lib/credit-operations'

// GET: 크레딧 잔액 조회 (Public API)
export const GET = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const db = getDb()
  const userDoc = await db.collection('users').doc(auth!.userId).get()

  if (!userDoc.exists) {
    return NextResponse.json(
      { success: false, error: '사용자를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  const data = userDoc.data()!
  const sCredit = data.sCredit ?? 0
  const eCredit = data.eCredit ?? 0

  return NextResponse.json({
    success: true,
    data: {
      sCredit,
      eCredit,
      totalCredit: sCredit + eCredit,
    },
  })
})

const DeductBodySchema = z.object({
  amount: z.number().positive('amount는 양수여야 합니다'),
  description: z.string().min(1, 'description은 필수입니다'),
  referenceId: z.string().optional(),
})

// POST: 크레딧 차감 (Public API)
export const POST = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const body = await request.json()
  const { amount, description, referenceId } = DeductBodySchema.parse(body)

  try {
    const result = await deductCredits(
      auth!.userId,
      amount,
      'debit',
      description,
      referenceId,
      'external_api'
    )

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        deducted: amount,
        sCreditUsed: result.sCreditUsed,
        eCreditUsed: result.eCreditUsed,
        sCredit: result.sCreditAfter,
        eCredit: result.eCreditAfter,
        totalCredit: result.sCreditAfter + result.eCreditAfter,
      },
    })
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_CREDIT') {
      return NextResponse.json(
        { success: false, error: error.message, code: 'INSUFFICIENT_CREDIT' },
        { status: 402 }
      )
    }
    throw error
  }
})
