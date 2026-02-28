import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { CreditSettingsSchema, DEFAULT_CREDIT_SETTINGS } from '@/lib/schemas/credit'
import { invalidateCreditSettingsCache } from '@/lib/credit-operations'

// GET: 크레딧 설정 조회
export const GET = createApiHandler({ auth: 'bearer', admin: true }, async (request, { auth }) => {
  const db = getDb()
  const doc = await db.collection('app_settings').doc('credit_config').get()

  const data = doc.exists
    ? { ...DEFAULT_CREDIT_SETTINGS, ...doc.data() }
    : DEFAULT_CREDIT_SETTINGS

  return NextResponse.json({ success: true, data })
})

// PUT: 크레딧 설정 수정
export const PUT = createApiHandler({ auth: 'bearer', admin: true }, async (request, { auth }) => {
  const body = await request.json()
  const settings = CreditSettingsSchema.parse(body)

  const db = getDb()
  await db.collection('app_settings').doc('credit_config').set(settings, { merge: true })

  invalidateCreditSettingsCache()

  return NextResponse.json({
    success: true,
    data: settings,
    message: '크레딧 설정이 업데이트되었습니다',
  })
})
