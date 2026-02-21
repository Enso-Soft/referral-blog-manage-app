import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { UpdatePostSchema } from '@/lib/schemas'
import {
  handleApiError,
  requireAuth,
  requireResource,
  requirePermission,
} from '@/lib/api-error-handler'

// Firestore 업데이트 데이터 타입 (Zod 스키마에서 파생 + Firestore 고유 필드)
type UpdateData = Partial<z.infer<typeof UpdatePostSchema>> & {
  updatedAt: FirebaseFirestore.Timestamp
  // Firestore dot-notation 필드 (threads.xxx, wordpress.xxx)
  [key: `threads.${string}`]: unknown
  [key: `wordpress.${string}`]: unknown
}

// GET: 단일 포스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { id } = await params
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(id)
    const doc = await docRef.get()

    requireResource(doc.exists ? doc : null, '포스트를 찾을 수 없습니다')

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 조회 가능
    requirePermission(
      auth.isAdmin || postData?.userId === auth.userId,
      '이 포스트에 대한 접근 권한이 없습니다'
    )

    return NextResponse.json({
      success: true,
      post: { id: doc.id, ...postData },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 포스트 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { id } = await params
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(id)
    const doc = await docRef.get()

    requireResource(doc.exists ? doc : null, '포스트를 찾을 수 없습니다')

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 수정 가능
    requirePermission(
      auth.isAdmin || postData?.userId === auth.userId,
      '이 포스트를 수정할 권한이 없습니다'
    )

    const body = await request.json()

    // Zod 스키마로 요청 바디 검증 (에러 시 handleApiError에서 처리)
    const validatedData = UpdatePostSchema.parse(body)

    // 업데이트 데이터 준비 (타입 안전)
    const updateData: UpdateData = {
      updatedAt: Timestamp.now(),
    }

    if (validatedData.content !== undefined) {
      updateData.content = validatedData.content
    }

    if (validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }

    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }

    if (validatedData.metadata !== undefined) {
      updateData.metadata = validatedData.metadata
    }

    if (validatedData.products !== undefined) {
      updateData.products = validatedData.products
    }

    if (validatedData.publishedUrls !== undefined) {
      updateData.publishedUrls = validatedData.publishedUrls
      // 하위호환: publishedUrl도 첫 번째 URL로 동기화
      const nonEmpty = validatedData.publishedUrls.filter(u => u)
      updateData.publishedUrl = nonEmpty.length > 0 ? nonEmpty[0] : ''
    } else if (validatedData.publishedUrl !== undefined) {
      updateData.publishedUrl = validatedData.publishedUrl
    }

    if (validatedData.postType !== undefined) {
      updateData.postType = validatedData.postType
    }

    if (validatedData.seoAnalysis !== undefined) {
      updateData.seoAnalysis = validatedData.seoAnalysis
    }

    if (validatedData.threads !== undefined) {
      // threads 부분 업데이트 (dot notation으로 개별 필드 업데이트)
      const threads = validatedData.threads as Record<string, unknown>
      for (const [key, value] of Object.entries(threads)) {
        if (value !== undefined) {
          updateData[`threads.${key}`] = value
        }
      }
    }

    if (validatedData.wordpress !== undefined) {
      const wordpress = validatedData.wordpress as Record<string, unknown>
      for (const [key, value] of Object.entries(wordpress)) {
        if (value !== undefined) {
          updateData[`wordpress.${key}`] = value
        }
      }
    }

    await docRef.update(updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: 포스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { id } = await params
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(id)
    const doc = await docRef.get()

    requireResource(doc.exists ? doc : null, '포스트를 찾을 수 없습니다')

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 삭제 가능
    requirePermission(
      auth.isAdmin || postData?.userId === auth.userId,
      '이 포스트를 삭제할 권한이 없습니다'
    )

    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
