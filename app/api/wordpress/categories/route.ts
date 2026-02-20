import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { getWPCategories, getWPConnectionFromUserData } from '@/lib/wordpress-api'

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

    const connResult = getWPConnectionFromUserData(userData as Record<string, unknown>, wpSiteId)
    if (!connResult) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }
    const categories = await getWPCategories(conn)

    return NextResponse.json({
      success: true,
      data: categories,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
