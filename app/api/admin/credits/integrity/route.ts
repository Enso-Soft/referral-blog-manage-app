import { NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { checkBalanceIntegrity } from '@/lib/credit-operations'

// GET: 잔액 무결성 검증
export const GET = createApiHandler({ auth: 'bearer', admin: true }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json(
      { success: false, error: 'userId 파라미터는 필수입니다' },
      { status: 400 }
    )
  }

  const result = await checkBalanceIntegrity(userId)

  return NextResponse.json({
    success: true,
    data: result,
  })
})
