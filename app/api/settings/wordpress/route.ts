import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { handleApiError } from '@/lib/api-error-handler'
import { createApiHandler } from '@/lib/api-handler'
import { validateWPConnection, detectWordPress, normalizeUrl, getAllWPSitesFromUserData } from '@/lib/wordpress-api'
import { encrypt, isEncrypted } from '@/lib/crypto'
import type { FirestoreUserData } from '@/lib/schemas/user'

// Lazy migration: 레거시 flat 필드 → wpSites map으로 이전
async function migrateIfNeeded(
  db: FirebaseFirestore.Firestore,
  userId: string,
  userData: FirestoreUserData
): Promise<string | null> {
  if (userData.wpSites) return null // 이미 마이그레이션됨
  if (!userData.wpSiteUrl || !userData.wpUsername || !userData.wpAppPassword) return null

  const { FieldValue } = await import('firebase-admin/firestore')
  const siteId = crypto.randomUUID().replace(/-/g, '').slice(0, 8)

  const encryptedPassword = isEncrypted(userData.wpAppPassword!)
    ? userData.wpAppPassword!
    : encrypt(userData.wpAppPassword!)

  await db.collection('users').doc(userId).update({
    [`wpSites.${siteId}`]: {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: encryptedPassword,
      displayName: userData.wpDisplayName || userData.wpUsername,
      connectedAt: FieldValue.serverTimestamp(),
    },
    wpSiteUrl: FieldValue.delete(),
    wpUsername: FieldValue.delete(),
    wpAppPassword: FieldValue.delete(),
    wpDisplayName: FieldValue.delete(),
  })

  return siteId
}

// POST: WordPress 사이트 추가
export const POST = createApiHandler({ auth: 'bearer' }, async (request: NextRequest, { auth }) => {
  try {
    const { siteUrl, username, appPassword } = await request.json()
    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { success: false, error: 'siteUrl, username, appPassword 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const normalizedUrl = normalizeUrl(siteUrl)

    // WordPress 사이트인지 감지
    await detectWordPress(normalizedUrl)

    // 인증 검증
    const userInfo = await validateWPConnection({ siteUrl: normalizedUrl, username, appPassword })

    const db = getDb()
    const { FieldValue } = await import('firebase-admin/firestore')

    // 사용자 데이터 조회 (레거시 마이그레이션 필요 여부 확인)
    const userDoc = await db.collection('users').doc(auth!.userId).get()
    const userData = (userDoc.data() || {}) as FirestoreUserData

    // 레거시 flat 필드 마이그레이션
    await migrateIfNeeded(db, auth!.userId, userData)

    // 새 사이트 ID 생성
    const siteId = crypto.randomUUID().replace(/-/g, '').slice(0, 8)

    await db.collection('users').doc(auth!.userId).update({
      [`wpSites.${siteId}`]: {
        siteUrl: normalizedUrl,
        username,
        appPassword: encrypt(appPassword),
        displayName: userInfo.name || username,
        connectedAt: FieldValue.serverTimestamp(),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: siteId,
        displayName: userInfo.name || username,
        siteUrl: normalizedUrl,
      },
      message: 'WordPress가 연결되었습니다.',
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes('WordPress') || error.message.includes('인증') || error.message.includes('사이트') || error.message.includes('REST API'))) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
})

// GET: WordPress 사이트 목록 조회
export const GET = createApiHandler({ auth: 'bearer' }, async (request: NextRequest, { auth }) => {
  const db = getDb()
  const userDoc = await db.collection('users').doc(auth!.userId).get()
  const userData = (userDoc.data() || {}) as FirestoreUserData

  // 레거시 flat 필드 마이그레이션
  await migrateIfNeeded(db, auth!.userId, userData)

  // 마이그레이션 후 최신 데이터로 다시 읽기 (마이그레이션 발생 시)
  let sites = getAllWPSitesFromUserData(userData)
  if (sites.length === 0 && (userData.wpSiteUrl || userData.wpSites)) {
    const freshDoc = await db.collection('users').doc(auth!.userId).get()
    sites = getAllWPSitesFromUserData((freshDoc.data() || {}) as FirestoreUserData)
  }

  return NextResponse.json({
    success: true,
    data: {
      sites: sites.map(s => ({
        id: s.id,
        siteUrl: s.siteUrl,
        displayName: s.displayName || null,
      })),
    },
  })
})

// DELETE: WordPress 사이트 연결 해제
export const DELETE = createApiHandler({ auth: 'bearer' }, async (request: NextRequest, { auth }) => {
  const siteId = request.nextUrl.searchParams.get('siteId')
  if (!siteId) {
    return NextResponse.json(
      { success: false, error: 'siteId 쿼리 파라미터는 필수입니다.' },
      { status: 400 }
    )
  }

  const db = getDb()
  const { FieldValue } = await import('firebase-admin/firestore')

  await db.collection('users').doc(auth!.userId).update({
    [`wpSites.${siteId}`]: FieldValue.delete(),
  })

  return NextResponse.json({
    success: true,
    message: 'WordPress 연결이 해제되었습니다.',
  })
})
