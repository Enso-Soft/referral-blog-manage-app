import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { getThreadsProfile, refreshThreadsToken } from '@/lib/threads-api'

// POST: Threads 토큰 저장
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { accessToken } = await request.json()
    if (!accessToken) {
      return NextResponse.json(
        { success: false, error: 'accessToken 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    // 토큰 검증 (GET /me 호출)
    const profile = await getThreadsProfile(accessToken)

    const db = getDb()
    await db.collection('users').doc(auth.userId).update({
      threadsAccessToken: accessToken,
      threadsTokenExpiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)), // 60일
      threadsUserId: profile.id,
      threadsUsername: profile.username,
    })

    return NextResponse.json({
      success: true,
      data: {
        username: profile.username,
        userId: profile.id,
      },
      message: 'Threads 계정이 연결되었습니다.',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Threads')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}

// GET: Threads 연결 상태 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.threadsAccessToken) {
      return NextResponse.json({
        success: true,
        data: { connected: false },
      })
    }

    const expiresAt = userData.threadsTokenExpiresAt?.toDate?.() || null
    const daysLeft = expiresAt
      ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        username: userData.threadsUsername || null,
        userId: userData.threadsUserId || null,
        expiresAt: expiresAt?.toISOString() || null,
        daysLeft,
        tokenPreview: userData.threadsAccessToken
          ? `${userData.threadsAccessToken.substring(0, 8)}...${userData.threadsAccessToken.slice(-4)}`
          : null,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: Threads 연결 해제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const { FieldValue } = await import('firebase-admin/firestore')
    await db.collection('users').doc(auth.userId).update({
      threadsAccessToken: FieldValue.delete(),
      threadsTokenExpiresAt: FieldValue.delete(),
      threadsUserId: FieldValue.delete(),
      threadsUsername: FieldValue.delete(),
    })

    return NextResponse.json({
      success: true,
      message: 'Threads 연결이 해제되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: Threads 토큰 갱신
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.threadsAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Threads 계정이 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const result = await refreshThreadsToken(userData.threadsAccessToken)

    await db.collection('users').doc(auth.userId).update({
      threadsAccessToken: result.access_token,
      threadsTokenExpiresAt: Timestamp.fromDate(
        new Date(Date.now() + result.expires_in * 1000)
      ),
    })

    const newExpiresAt = new Date(Date.now() + result.expires_in * 1000)

    return NextResponse.json({
      success: true,
      data: {
        expiresAt: newExpiresAt.toISOString(),
        daysLeft: Math.ceil(result.expires_in / (60 * 60 * 24)),
      },
      message: 'Threads 토큰이 갱신되었습니다.',
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('토큰')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }
    return handleApiError(error)
  }
}
