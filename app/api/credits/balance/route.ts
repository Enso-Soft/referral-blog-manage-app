import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'

// GET: 크레딧 잔액 조회
export const GET = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const db = getDb()
  const userDoc = await db.collection('users').doc(auth.userId).get()

  if (!userDoc.exists) {
    return NextResponse.json(
      { success: false, error: '사용자를 찾을 수 없습니다' },
      { status: 404 }
    )
  }

  const data = userDoc.data()!
  const sCredit = data.sCredit ?? 0
  const eCredit = data.eCredit ?? 0

  return NextResponse.json({
    success: true,
    data: {
      sCredit,
      eCredit,
      totalCredit: sCredit + eCredit,
      lastCheckIn: data.lastCheckIn?.toDate?.()?.toISOString() || null,
    },
  })
})
