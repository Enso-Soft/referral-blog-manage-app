import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { requireResource } from '@/lib/api-error-handler'

// PATCH: 콘텐츠 상태 수정
export const PATCH = createApiHandler({ auth: 'bearer', admin: true }, async (request, { params }) => {
  const { id } = params!
  const body = await request.json()
  const { status } = body

  // 유효성 검사
  if (status && !['draft', 'published'].includes(status)) {
    return NextResponse.json(
      { success: false, error: '유효하지 않은 상태입니다' },
      { status: 400 }
    )
  }

  const db = getDb()
  const postRef = db.collection('blog_posts').doc(id)
  const postDoc = await postRef.get()
  requireResource(postDoc.exists ? postDoc : null, '콘텐츠를 찾을 수 없습니다')

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }
  if (status) updateData.status = status

  await postRef.update(updateData)

  return NextResponse.json({
    success: true,
    message: '콘텐츠가 업데이트되었습니다',
  })
})

// DELETE: 콘텐츠 삭제
export const DELETE = createApiHandler({ auth: 'bearer', admin: true }, async (request, { params }) => {
  const { id } = params!
  const db = getDb()
  const postRef = db.collection('blog_posts').doc(id)
  const postDoc = await postRef.get()
  requireResource(postDoc.exists ? postDoc : null, '콘텐츠를 찾을 수 없습니다')

  await postRef.delete()

  return NextResponse.json({
    success: true,
    message: '콘텐츠가 삭제되었습니다',
  })
})
