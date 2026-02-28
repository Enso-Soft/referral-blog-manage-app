import { NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { z } from 'zod'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { getOwnedDocument } from '@/lib/api-helpers'
import { countContentChars } from '@/lib/utils'
import { SeoAnalysisSchema, ThreadsContentSchema } from '@/lib/schemas'

const PublishPostSchema = z.object({
  title: z.string().min(1, 'title 필드는 필수입니다.'),
  content: z.string().min(1, 'content 필드는 필수입니다.'),
  slug: z.string().min(1, 'slug 필드는 필수입니다.'),
  excerpt: z.string().min(1, 'excerpt 필드는 필수입니다.'),
  keywords: z.array(z.string()).optional(),
  products: z.array(z.object({
    name: z.string(),
    affiliateLink: z.string(),
  }).passthrough()).optional(),
  seoAnalysis: SeoAnalysisSchema.optional(),
  threads: ThreadsContentSchema.optional(),
  wordpress: z.object({
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    commentStatus: z.enum(['open', 'closed']).optional(),
  }).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

// POST: 외부에서 블로그 글 등록
export const POST = createApiHandler({ auth: 'apiKey' }, async (request, { auth }) => {
  const body = await request.json()
  const parsed = PublishPostSchema.parse(body)

  const db = getDb()
  const now = Timestamp.now()

  const products = parsed.products?.filter(p => p.name && p.affiliateLink) || []
  const postType = products.length > 0 ? 'affiliate' : 'general'

  let wordpressData: Record<string, unknown> | undefined
  if (parsed.wordpress) {
    wordpressData = { postStatus: 'not_published', ...parsed.wordpress }
  }

  const docData = {
    userId: auth.userId,
    userEmail: auth.email,
    title: parsed.title,
    content: parsed.content,
    slug: parsed.slug,
    excerpt: parsed.excerpt,
    keywords: parsed.keywords || [],
    products,
    postType,
    ...(parsed.seoAnalysis && { seoAnalysis: parsed.seoAnalysis }),
    ...(parsed.threads && { threads: { ...parsed.threads, postStatus: parsed.threads.postStatus || 'not_posted' } }),
    ...(wordpressData && { wordpress: wordpressData }),
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    metadata: {
      wordCount: countContentChars(parsed.content),
      source: 'api',
      ...(parsed.metadata || {}),
    },
  }

  const docRef = await db.collection('blog_posts').add(docData)

  return NextResponse.json({
    success: true,
    data: {
      id: docRef.id,
      title: docData.title,
      slug: docData.slug,
      excerpt: docData.excerpt,
      status: docData.status,
      createdAt: now.toDate().toISOString(),
    },
    message: '블로그 글이 등록되었습니다.',
  })
})

// GET: 게시글 조회 (단일 또는 목록)
export const GET = createApiHandler({ auth: 'apiKey' }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const db = getDb()

  // 단일 게시글 조회
  if (id) {
    const { data } = await getOwnedDocument('blog_posts', id, auth, '게시글')

    return NextResponse.json({
      success: true,
      data: {
        id,
        title: data.title,
        content: data.content,
        slug: data.slug || null,
        excerpt: data.excerpt || null,
        keywords: data.keywords || [],
        products: data.products || [],
        status: data.status,
        seoAnalysis: data.seoAnalysis || null,
        threads: data.threads || null,
        wordpress: data.wordpress ? {
          slug: data.wordpress.slug || null,
          excerpt: data.wordpress.excerpt || null,
          commentStatus: data.wordpress.commentStatus || null,
          postStatus: data.wordpress.postStatus || null,
          wpPostId: data.wordpress.wpPostId || null,
          wpPostUrl: data.wordpress.wpPostUrl || null,
        } : null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        metadata: data.metadata || {},
      },
    })
  }

  // 목록 조회
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const lastId = searchParams.get('lastId')
  const status = searchParams.get('status')

  let query = db.collection('blog_posts')
    .where('userId', '==', auth.userId)
    .orderBy('createdAt', 'desc')

  if (status && ['draft', 'published'].includes(status)) {
    query = query.where('status', '==', status)
  }

  if (lastId) {
    const lastDoc = await db.collection('blog_posts').doc(lastId).get()
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc)
    }
  } else if (page > 1) {
    query = query.offset((page - 1) * limit)
  }

  const snapshot = await query.limit(limit).get()

  const posts = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      title: data.title,
      slug: data.slug || null,
      status: data.status,
      keywords: data.keywords || [],
      threadsPostStatus: data.threads?.postStatus || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
    }
  })

  const lastDoc = snapshot.docs[snapshot.docs.length - 1]

  return NextResponse.json({
    success: true,
    data: posts,
    pagination: {
      page,
      limit,
      count: posts.length,
      lastId: lastDoc?.id || null,
      hasMore: snapshot.docs.length === limit,
    },
  })
})

// PATCH: 게시글 수정
export const PATCH = createApiHandler({ auth: 'apiKey' }, async (request, { auth }) => {
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json(
      { success: false, error: 'id 필드는 필수입니다.' },
      { status: 400 }
    )
  }

  const { docRef, data: existingData } = await getOwnedDocument('blog_posts', body.id, auth, '게시글')

  const updateData: Record<string, unknown> = {
    updatedAt: Timestamp.now(),
  }

  if (body.title !== undefined) updateData.title = body.title
  if (body.content !== undefined) {
    updateData.content = body.content
    updateData['metadata.wordCount'] = countContentChars(body.content)
  }
  if (body.keywords !== undefined && Array.isArray(body.keywords)) updateData.keywords = body.keywords
  if (body.products !== undefined && Array.isArray(body.products)) {
    const validProducts = body.products.filter((p: { name?: string; affiliateLink?: string }) => p.name && p.affiliateLink)
    updateData.products = validProducts
    updateData.postType = validProducts.length > 0 ? 'affiliate' : 'general'
  }
  if (body.slug !== undefined) updateData.slug = body.slug
  if (body.excerpt !== undefined) updateData.excerpt = body.excerpt
  if (body.status !== undefined && ['draft', 'published'].includes(body.status)) updateData.status = body.status

  if (body.seoAnalysis !== undefined) {
    updateData.seoAnalysis = SeoAnalysisSchema.parse(body.seoAnalysis)
  }

  if (body.threads !== undefined && typeof body.threads === 'object') {
    const threadsFields = ['text', 'hashtag', 'imageUrl', 'linkUrl', 'postStatus', 'threadsPostId', 'postedAt', 'errorMessage'] as const
    for (const field of threadsFields) {
      if (body.threads[field] !== undefined) {
        updateData[`threads.${field}`] = body.threads[field]
      }
    }
  }

  if (body.wordpress !== undefined && typeof body.wordpress === 'object') {
    const wpFields = ['slug', 'excerpt', 'commentStatus'] as const
    for (const field of wpFields) {
      if (body.wordpress[field] !== undefined) {
        updateData[`wordpress.${field}`] = body.wordpress[field]
      }
    }
  }

  await docRef.update(updateData)

  const mergedData = { ...existingData, ...updateData }

  return NextResponse.json({
    success: true,
    data: {
      id: body.id,
      title: mergedData.title,
      content: mergedData.content,
      slug: mergedData.slug || null,
      excerpt: mergedData.excerpt || null,
      keywords: mergedData.keywords || [],
      products: mergedData.products || [],
      status: mergedData.status,
      createdAt: existingData.createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: (updateData.updatedAt as Timestamp).toDate().toISOString(),
    },
    message: '게시글이 수정되었습니다.',
  })
})

// DELETE: 게시글 삭제
export const DELETE = createApiHandler({ auth: 'apiKey' }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'id 파라미터는 필수입니다.' },
      { status: 400 }
    )
  }

  const { docRef } = await getOwnedDocument('blog_posts', id, auth, '게시글')
  await docRef.delete()

  return NextResponse.json({
    success: true,
    data: { id },
    message: '게시글이 삭제되었습니다.',
  })
})
