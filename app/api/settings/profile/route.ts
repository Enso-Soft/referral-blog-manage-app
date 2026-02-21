import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { getAllWPSitesFromUserData } from '@/lib/wordpress-api'
import type { FirestoreUserData } from '@/lib/schemas/user'

// GET: 설정 페이지 통합 프로필 조회 (users 문서 1회 읽기)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = (userDoc.data() || {}) as FirestoreUserData

    // API Key
    const apiKey = userData.apiKey || null

    // Threads 연결 정보
    let threads: {
      connected: boolean
      username?: string | null
      expiresAt?: string | null
      daysLeft?: number | null
    } = { connected: false }

    if (userData.threadsAccessToken) {
      const expiresAt = userData.threadsTokenExpiresAt?.toDate?.() || null
      const daysLeft = expiresAt
        ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null

      threads = {
        connected: true,
        username: userData.threadsUsername || null,
        expiresAt: expiresAt?.toISOString() || null,
        daysLeft,
      }
    }

    // WordPress 사이트 목록
    const wpSites = getAllWPSitesFromUserData(userData).map(s => ({
      id: s.id,
      siteUrl: s.siteUrl,
      displayName: s.displayName || null,
    }))

    return NextResponse.json({
      success: true,
      data: {
        apiKey,
        threads,
        wpSites,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
