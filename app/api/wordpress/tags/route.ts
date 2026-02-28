import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getWPTags, createWPTag } from '@/lib/wordpress-api'
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

  const tags = await getWPTags(wpConn.conn)

  return NextResponse.json({
    success: true,
    data: tags,
  })
})

export const POST = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const { name, wpSiteId } = await request.json()
  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { success: false, error: '태그 이름은 필수입니다.' },
      { status: 400 }
    )
  }

  const wpConn = await getWPConnection(auth.userId, wpSiteId)
  if (!wpConn) {
    return NextResponse.json(
      { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
      { status: 400 }
    )
  }

  const tag = await createWPTag(wpConn.conn, name)

  return NextResponse.json({
    success: true,
    data: tag,
  })
})
