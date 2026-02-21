import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'
import { getDb } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/lib/auth-admin'
import { logger } from '@/lib/logger'

// API 키 생성 함수
function generateApiKey(): string {
  const bytes = randomBytes(24)
  return `bp_${bytes.toString('hex')}`
}

// POST: 회원가입 후 users 컬렉션에 문서 생성
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

    const body = await request.json()
    const { displayName } = body

    const db = getDb()
    const userRef = db.collection('users').doc(decodedToken.uid)

    // 이미 존재하는지 확인
    const existingDoc = await userRef.get()
    if (existingDoc.exists) {
      return NextResponse.json({ success: true, message: '이미 등록됨' })
    }

    // users 문서 생성 (API 키 포함)
    const apiKey = generateApiKey()
    await userRef.set({
      email: decodedToken.email,
      displayName: displayName || null,
      role: 'user',
      apiKey,
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: '등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
