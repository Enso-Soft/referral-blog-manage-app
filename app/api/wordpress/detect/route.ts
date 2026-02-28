import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { detectWordPress, normalizeUrl } from '@/lib/wordpress-api'

export const POST = createApiHandler({ auth: 'bearer' }, async (request) => {
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
})
