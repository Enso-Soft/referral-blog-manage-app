import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { createCheckoutSession } from '@/lib/lemon-squeezy'

// POST: Lemon Squeezy 결제 세션 생성
export const POST = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const variantId = process.env.LEMON_SQUEEZY_VARIANT_ID
  if (!variantId) {
    return NextResponse.json(
      { success: false, error: '결제 설정이 완료되지 않았습니다' },
      { status: 500 }
    )
  }

  const origin = request.headers.get('origin') || request.nextUrl.origin
  const checkoutUrl = await createCheckoutSession(auth.userId, variantId, origin)

  return NextResponse.json({
    success: true,
    data: { checkoutUrl },
  })
})
