import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { createCheckoutSession } from '@/lib/lemon-squeezy'

// POST: Lemon Squeezy 결제 세션 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const body = await request.json()
    const { variantId } = body

    if (!variantId) {
      return NextResponse.json(
        { success: false, error: 'variantId는 필수입니다' },
        { status: 400 }
      )
    }

    const checkoutUrl = await createCheckoutSession(auth.userId, variantId)

    return NextResponse.json({
      success: true,
      data: { checkoutUrl },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
