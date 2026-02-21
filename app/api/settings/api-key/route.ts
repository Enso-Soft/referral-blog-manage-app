import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getDb } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/lib/auth-admin'
import { logger } from '@/lib/logger'

// API 키 생성 함수
function generateApiKey(): string {
  const bytes = randomBytes(24)
  return `bp_${bytes.toString('hex')}`
}

// POST: API 키 재발급
export async function POST(request: NextRequest) {
  try {
    // 토큰 검증
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const decodedToken = await verifyIdToken(token)

    const db = getDb()
    const userRef = db.collection('users').doc(decodedToken.uid)

    // 새 API 키 생성 및 업데이트
    const newApiKey = generateApiKey()
    await userRef.update({
      apiKey: newApiKey,
    })

    return NextResponse.json({ success: true, apiKey: newApiKey })
  } catch (error) {
    logger.error('API key regenerate error:', error)
    return NextResponse.json(
      { success: false, error: 'API 키 재발급에 실패했습니다' },
      { status: 500 }
    )
  }
}
