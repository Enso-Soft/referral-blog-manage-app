import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { randomBytes } from 'crypto'
import { getDb } from '@/lib/firebase-admin'
import { verifyIdToken } from '@/lib/auth-admin'
import { logger } from '@/lib/logger'
import { getCreditSettings } from '@/lib/credit-operations'

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

    const settings = await getCreditSettings()
    const apiKey = generateApiKey()
    const now = Timestamp.now()

    // 존재 확인 + 문서 생성 + signup_grant 로그를 트랜잭션으로 원자 처리한다.
    // (check-then-write 배치는 동시 요청 시 둘 다 통과해 가입 크레딧이 이중 지급될 수 있음)
    const created = await db.runTransaction(async (transaction) => {
      const existingDoc = await transaction.get(userRef)
      if (existingDoc.exists) {
        return false
      }

      const txnRef = db.collection('credit_transactions').doc()

      transaction.set(userRef, {
        email: decodedToken.email,
        displayName: displayName || null,
        role: 'user',
        apiKey,
        sCredit: settings.signupGrantAmount,
        eCredit: 0,
        createdAt: now,
      })

      transaction.set(txnRef, {
        userId: decodedToken.uid,
        type: 'credit',
        sCreditDelta: settings.signupGrantAmount,
        eCreditDelta: 0,
        sCreditAfter: settings.signupGrantAmount,
        eCreditAfter: 0,
        description: `회원가입 ${settings.signupGrantAmount.toLocaleString()} S'Credit 지급`,
        createdAt: now,
      })

      return true
    })

    if (!created) {
      return NextResponse.json({ success: true, message: '이미 등록됨' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Register error:', error)
    return NextResponse.json(
      { success: false, error: '등록에 실패했습니다' },
      { status: 500 }
    )
  }
}
