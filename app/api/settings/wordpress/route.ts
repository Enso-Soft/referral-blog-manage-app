import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { validateWPConnection, detectWordPress, normalizeUrl } from '@/lib/wordpress-api'

// POST: WordPress 연결 설정
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { siteUrl, username, appPassword } = await request.json()
    if (!siteUrl || !username || !appPassword) {
      return NextResponse.json(
        { success: false, error: 'siteUrl, username, appPassword 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    // URL 정규화 (site.com, www.site.com, https://site.com 등 모두 처리)
    const normalizedUrl = normalizeUrl(siteUrl)

    // WordPress 사이트인지 감지
    await detectWordPress(normalizedUrl)

    // 인증 검증
    const userInfo = await validateWPConnection({ siteUrl: normalizedUrl, username, appPassword })

    const db = getDb()
    await db.collection('users').doc(auth.userId).update({
      wpSiteUrl: normalizedUrl,
      wpUsername: username,
      wpAppPassword: appPassword,
      wpDisplayName: userInfo.name || username,
    })

    return NextResponse.json({
      success: true,
      data: {
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
}

// GET: WordPress 연결 상태 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.wpSiteUrl) {
      return NextResponse.json({
        success: true,
        data: { connected: false },
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        siteUrl: userData.wpSiteUrl,
        displayName: userData.wpDisplayName || userData.wpUsername || null,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: WordPress 연결 해제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const { FieldValue } = await import('firebase-admin/firestore')
    await db.collection('users').doc(auth.userId).update({
      wpSiteUrl: FieldValue.delete(),
      wpUsername: FieldValue.delete(),
      wpAppPassword: FieldValue.delete(),
      wpDisplayName: FieldValue.delete(),
    })

    return NextResponse.json({
      success: true,
      message: 'WordPress 연결이 해제되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
