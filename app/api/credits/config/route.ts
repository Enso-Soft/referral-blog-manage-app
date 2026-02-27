import { NextResponse } from 'next/server'
import { getCreditSettings } from '@/lib/credit-operations'
import { handleApiError } from '@/lib/api-error-handler'

/**
 * GET /api/credits/config
 * 공개 크레딧 설정 조회 (인증 불필요) — 랜딩 페이지용
 * signupGrantAmount, checkinGrantAmount만 노출
 */
export async function GET() {
  try {
    const settings = await getCreditSettings()
    return NextResponse.json({
      success: true,
      data: {
        signupGrantAmount: settings.signupGrantAmount,
        checkinGrantAmount: settings.checkinGrantAmount,
        creditPerWon: settings.creditPerWon,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
