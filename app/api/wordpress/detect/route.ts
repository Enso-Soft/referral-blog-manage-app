import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { detectWordPress, normalizeUrl } from '@/lib/wordpress-api'

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { url } = await request.json()
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL이 필요합니다.' },
        { status: 400 }
      )
    }

    const normalizedUrl = normalizeUrl(url)

    try {
      const siteInfo = await detectWordPress(normalizedUrl)

      return NextResponse.json({
        success: true,
        data: {
          isWordPress: true,
          siteName: siteInfo.name || null,
          siteUrl: normalizedUrl,
        },
      })
    } catch (error) {
      return NextResponse.json({
        success: true,
        data: {
          isWordPress: false,
          error: error instanceof Error ? error.message : 'WordPress 사이트가 아닙니다.',
        },
      })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
