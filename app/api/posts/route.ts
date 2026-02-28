import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { CreatePostSchema, ProductSchema } from '@/lib/schemas'
import { createApiHandler } from '@/lib/api-handler'

// GET: 포스트 목록 조회
export const GET = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '20')
  const lastId = searchParams.get('lastId')
  const excludeContent = searchParams.get('excludeContent') === 'true'
  const includeCount = searchParams.get('includeCount') !== 'false' // 기본값 true

  const db = getDb()
  const postsRef = db.collection('blog_posts')
  let query: FirebaseFirestore.Query = postsRef

  // Admin이 아니면 본인 포스트만 조회
  if (!auth.isAdmin) {
    query = query.where('userId', '==', auth.userId)
  }

  // 상태 필터
  if (status && (status === 'draft' || status === 'published')) {
    query = query.where('status', '==', status)
  }

  query = query.orderBy('createdAt', 'desc')

  // 카운트 + 커서 문서 병렬 조회
  const [countResult, lastDoc] = await Promise.all([
    includeCount ? query.count().get() : Promise.resolve(null),
    lastId ? postsRef.doc(lastId).get() : Promise.resolve(null),
  ])

  const total = countResult?.data().count

  if (lastDoc?.exists) {
    query = query.startAfter(lastDoc)
  }

  query = query.limit(limit)

  const snapshot = await query.get()
  const posts = snapshot.docs.map((doc) => {
    const data = doc.data()
    // content 제외 옵션
    if (excludeContent) {
      const { content, ...rest } = data
      return { id: doc.id, ...rest }
    }
    return { id: doc.id, ...data }
  })

  const hasMore = posts.length === limit

  return NextResponse.json({
    success: true,
    posts,
    ...(total !== undefined && { total }),
    hasMore,
  })
})

// POST: 새 포스트 생성
export const POST = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const body = await request.json()

  // Zod 스키마로 요청 바디 검증 (에러 시 handleApiError에서 처리)
  const validatedData = CreatePostSchema.parse(body)
  const db = getDb()

  const now = Timestamp.now()

  // products 배열 검증 (이미 CreatePostSchema에 포함되어 있지만, 추가 필터링)
  const products = validatedData.products
    ? validatedData.products.filter((p) => {
        const productResult = ProductSchema.safeParse(p)
        return productResult.success
      })
    : []

  const docData = {
    userId: auth.userId,
    userEmail: auth.email,
    title: validatedData.title,
    content: validatedData.content,
    keywords: validatedData.keywords,
    products,
    postType: validatedData.postType,
    status: validatedData.status,
    createdAt: now,
    updatedAt: now,
    metadata: validatedData.metadata || { wordCount: 0 },
  }

  const docRef = await db.collection('blog_posts').add(docData)

  return NextResponse.json({
    success: true,
    id: docRef.id,
  })
})
