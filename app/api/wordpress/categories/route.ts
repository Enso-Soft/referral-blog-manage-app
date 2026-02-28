import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getWPCategories } from '@/lib/wordpress-api'
import { getWPConnection } from '@/app/api/wordpress/publish/service'

export const GET = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const wpSiteId = request.nextUrl.searchParams.get('wpSiteId')

  const wpConn = await getWPConnection(auth.userId, wpSiteId)
  if (!wpConn) {
    return NextResponse.json(
      { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
      { status: 400 }
    )
  }

  const categories = await getWPCategories(wpConn.conn)

  return NextResponse.json({
    success: true,
    data: categories,
  })
})
