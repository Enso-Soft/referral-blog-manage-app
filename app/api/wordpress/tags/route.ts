import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { getWPTags, createWPTag } from '@/lib/wordpress-api'
import { getDecryptedWPConnection } from '@/lib/api-helpers'
import type { FirestoreUserData } from '@/lib/schemas/user'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const wpSiteId = request.nextUrl.searchParams.get('wpSiteId')

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const connResult = getDecryptedWPConnection(userData as FirestoreUserData, wpSiteId)
    if (!connResult) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }
    const tags = await getWPTags(conn)

    return NextResponse.json({
      success: true,
      data: tags,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { name, wpSiteId } = await request.json()
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { success: false, error: '태그 이름은 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const connResult = getDecryptedWPConnection(userData as FirestoreUserData, wpSiteId)
    if (!connResult) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }
    const tag = await createWPTag(conn, name)

    return NextResponse.json({
      success: true,
      data: tag,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
