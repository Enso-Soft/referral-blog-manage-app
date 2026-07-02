import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { hashApiKey } from '@/lib/crypto'
import { invalidateUserDataCache } from '@/lib/auth-admin'

// API 키 생성 함수
function generateApiKey(): string {
  const bytes = randomBytes(24)
  return `bp_${bytes.toString('hex')}`
}

// POST: API 키 재발급
export const POST = createApiHandler({ auth: 'bearer' }, async (request: NextRequest, { auth }) => {
  const db = getDb()
  const userRef = db.collection('users').doc(auth!.userId)

  // 새 API 키 생성 및 업데이트 (해시만 저장)
  const newApiKey = generateApiKey()
  await userRef.update({
    apiKey: newApiKey, // 하위호환용 (마이그레이션 완료 후 제거)
    apiKeyHash: hashApiKey(newApiKey),
    apiKeyCreatedAt: new Date(),
  })

  // 캐시된 stale apiKey가 Bearer 인증 라우트에서 최대 5분간 서빙되는 것을 방지
  invalidateUserDataCache(auth!.userId)

  return NextResponse.json({ success: true, apiKey: newApiKey })
})
