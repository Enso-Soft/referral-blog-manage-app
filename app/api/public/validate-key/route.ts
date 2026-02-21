import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromApiKey } from '@/lib/auth-admin'
import { logger } from '@/lib/logger'

// GET: API 키 유효성 검증
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing API key.' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: auth.userId,
      },
    })
  } catch (error) {
    logger.error('API key validation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 }
    )
  }
}
