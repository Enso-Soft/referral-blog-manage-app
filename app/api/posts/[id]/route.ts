import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { UpdatePostSchema } from '@/lib/schemas'
import { createApiHandler } from '@/lib/api-handler'
import { getOwnedDocument } from '@/lib/api-helpers'

// Firestore 업데이트 데이터 타입 (Zod 스키마에서 파생 + Firestore 고유 필드)
type UpdateData = Partial<z.infer<typeof UpdatePostSchema>> & {
  updatedAt: FirebaseFirestore.Timestamp
  [key: `threads.${string}`]: unknown
  [key: `wordpress.${string}`]: unknown
}

// GET: 단일 포스트 조회
export const GET = createApiHandler({ auth: 'bearer' }, async (_request, { auth, params }) => {
  const { doc, data } = await getOwnedDocument('blog_posts', params!.id, auth!, '포스트')

  return NextResponse.json({
    success: true,
    post: { id: doc.id, ...data },
  })
})

// PATCH: 포스트 업데이트
export const PATCH = createApiHandler({ auth: 'bearer' }, async (request, { auth, params }) => {
  const { docRef } = await getOwnedDocument('blog_posts', params!.id, auth!, '포스트')

  const body = await request.json()
  const validatedData = UpdatePostSchema.parse(body)

  const updateData: UpdateData = {
    updatedAt: Timestamp.now(),
  }

  if (validatedData.content !== undefined) updateData.content = validatedData.content
  if (validatedData.title !== undefined) updateData.title = validatedData.title
  if (validatedData.status !== undefined) updateData.status = validatedData.status
  if (validatedData.metadata !== undefined) updateData.metadata = validatedData.metadata
  if (validatedData.products !== undefined) updateData.products = validatedData.products

  if (validatedData.publishedUrls !== undefined) {
    updateData.publishedUrls = validatedData.publishedUrls
    const nonEmpty = validatedData.publishedUrls.filter(u => u)
    updateData.publishedUrl = nonEmpty.length > 0 ? nonEmpty[0] : ''
  } else if (validatedData.publishedUrl !== undefined) {
    updateData.publishedUrl = validatedData.publishedUrl
  }

  if (validatedData.postType !== undefined) updateData.postType = validatedData.postType
  if (validatedData.seoAnalysis !== undefined) updateData.seoAnalysis = validatedData.seoAnalysis

  if (validatedData.threads !== undefined) {
    const threads = validatedData.threads as Record<string, unknown>
    for (const [key, value] of Object.entries(threads)) {
      if (value !== undefined) updateData[`threads.${key}`] = value
    }
  }

  if (validatedData.wordpress !== undefined) {
    const wordpress = validatedData.wordpress as Record<string, unknown>
    for (const [key, value] of Object.entries(wordpress)) {
      if (value !== undefined) updateData[`wordpress.${key}`] = value
    }
  }

  await docRef.update(updateData)

  return NextResponse.json({ success: true })
})

// DELETE: 포스트 삭제
export const DELETE = createApiHandler({ auth: 'bearer' }, async (_request, { auth, params }) => {
  const { docRef } = await getOwnedDocument('blog_posts', params!.id, auth!, '포스트')
  await docRef.delete()
  return NextResponse.json({ success: true })
})
