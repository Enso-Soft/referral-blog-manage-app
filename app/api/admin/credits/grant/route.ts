import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAdmin } from '@/lib/api-error-handler'
import { grantCredits, adminDeductCredits } from '@/lib/credit-operations'

const GrantBodySchema = z.object({
  userId: z.string().min(1),
  sAmount: z.number().default(0),
  eAmount: z.number().default(0),
  description: z.string().min(1, '설명은 필수입니다'),
})

// POST: 관리자 수동 크레딧 지급/차감
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAdmin(auth)

    const body = await request.json()
    const { userId, sAmount, eAmount, description } = GrantBodySchema.parse(body)

    if (sAmount === 0 && eAmount === 0) {
      return NextResponse.json(
        { success: false, error: '지급/차감 금액을 입력해주세요' },
        { status: 400 }
      )
    }

    // 양수: 지급, 음수: 차감
    const isDeduct = sAmount < 0 || eAmount < 0

    if (isDeduct) {
      // S/E 개별 차감 (관리자 의도대로 제어)
      const sDeduct = Math.abs(sAmount)
      const eDeduct = Math.abs(eAmount)
      const result = await adminDeductCredits(
        userId,
        sDeduct,
        eDeduct,
        `[관리자] ${description}`,
        auth.userId
      )

      return NextResponse.json({
        success: true,
        data: {
          transactionId: result.transactionId,
          sCredit: result.sCreditAfter,
          eCredit: result.eCreditAfter,
        },
        message: `크레딧 ${(sDeduct + eDeduct).toLocaleString()} 차감 완료`,
      })
    }

    // 지급
    const result = await grantCredits(
      userId,
      Math.max(0, sAmount),
      Math.max(0, eAmount),
      'credit',
      `[관리자] ${description}`,
      undefined,
      undefined,
      auth.userId
    )

    return NextResponse.json({
      success: true,
      data: {
        transactionId: result.transactionId,
        sCredit: result.sCreditAfter,
        eCredit: result.eCreditAfter,
      },
      message: '크레딧 지급 완료',
    })
  } catch (error: any) {
    if (error.code === 'INSUFFICIENT_CREDIT') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 402 }
      )
    }
    return handleApiError(error)
  }
}
