import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { SeoAnalysisSchema, ThreadsContentSchema } from '@/lib/schemas'

interface UserData {
  uid: string
  email: string
  displayName?: string
  role: string
  apiKey: string
}

// API 키로 유저 찾기
async function getUserByApiKey(apiKey: string): Promise<UserData | null> {
  const db = getDb()
  const snapshot = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()
  return {
    uid: doc.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    apiKey: data.apiKey,
  }
}

// POST: 외부에서 블로그 글 등록
export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    // API 키로 유저 찾기
    const user = await getUserByApiKey(apiKey)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }

    // 요청 바디 파싱
    const body = await request.json()

    // 필수 필드 검증
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'title 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'content 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!body.slug) {
      return NextResponse.json(
        { success: false, error: 'slug 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!body.excerpt) {
      return NextResponse.json(
        { success: false, error: 'excerpt 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    // seoAnalysis 검증 (optional)
    let seoData: any = undefined
    if (body.seoAnalysis) {
      const seoResult = SeoAnalysisSchema.safeParse(body.seoAnalysis)
      if (!seoResult.success) {
        return NextResponse.json(
          { success: false, error: 'seoAnalysis 형식이 올바르지 않습니다.', details: seoResult.error.flatten() },
          { status: 400 }
        )
      }
      seoData = seoResult.data
    }

    // threads 검증 (optional)
    let threadsData: any = undefined
    if (body.threads) {
      const threadsResult = ThreadsContentSchema.safeParse(body.threads)
      if (!threadsResult.success) {
        return NextResponse.json(
          { success: false, error: 'threads 형식이 올바르지 않습니다.', details: threadsResult.error.flatten() },
          { status: 400 }
        )
      }
      threadsData = threadsResult.data
    }

    const db = getDb()
    const now = Timestamp.now()

    // products 검증
    const products = Array.isArray(body.products)
      ? body.products.filter((p: any) => p.name && p.affiliateLink)
      : []

    // postType 자동 설정 (제품이 있으면 제휴, 없으면 일반)
    const postType = products.length > 0 ? 'affiliate' : 'general'

    // wordpress 옵션 구성 (slug, excerpt, meta, commentStatus)
    let wordpressData: Record<string, any> | undefined
    if (body.wordpress && typeof body.wordpress === 'object') {
      wordpressData = { postStatus: 'not_published' }
      if (body.wordpress.slug) wordpressData.slug = body.wordpress.slug
      if (body.wordpress.excerpt) wordpressData.excerpt = body.wordpress.excerpt
      if (body.wordpress.commentStatus && ['open', 'closed'].includes(body.wordpress.commentStatus)) {
        wordpressData.commentStatus = body.wordpress.commentStatus
      }
    }

    // 블로그 포스트 생성
    const docData = {
      userId: user.uid,
      userEmail: user.email,
      title: body.title,
      content: body.content,
      slug: body.slug,
      excerpt: body.excerpt,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      products,
      postType, // 자동 설정된 타입
      ...(seoData && { seoAnalysis: seoData }),
      ...(threadsData && { threads: { ...threadsData, postStatus: threadsData.postStatus || 'not_posted' } }),
      ...(wordpressData && { wordpress: wordpressData }),
      status: 'draft',
      createdAt: now,
      updatedAt: now,
      metadata: {
        wordCount: body.content.replace(/<[^>]*>/g, '').length,
        source: 'api',
        ...(body.metadata || {}),
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
  } catch (error) {
    console.error('Publish API error:', error)
    return NextResponse.json(
      { success: false, error: '블로그 글 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// GET: 게시글 조회 (단일 또는 목록)
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const user = await getUserByApiKey(apiKey)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const db = getDb()

    // 단일 게시글 조회
    if (id) {
      const docRef = db.collection('blog_posts').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: '게시글을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const data = doc.data()!

      // 소유권 확인
      if (data.userId !== user.uid) {
        return NextResponse.json(
          { success: false, error: '이 게시글에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
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
    const status = searchParams.get('status') // 'draft' | 'published' | null (all)

    let query = db.collection('blog_posts')
      .where('userId', '==', user.uid)
      .orderBy('createdAt', 'desc')

    if (status && ['draft', 'published'].includes(status)) {
      query = query.where('status', '==', status)
    }

    // 커서 기반 페이지네이션 (lastId 우선, 없으면 page 기반 하위 호환)
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
  } catch (error) {
    console.error('Publish API GET error:', error)
    return NextResponse.json(
      { success: false, error: '게시글 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH: 게시글 수정
export async function PATCH(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const user = await getUserByApiKey(apiKey)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }

    const body = await request.json()

    if (!body.id) {
      return NextResponse.json(
        { success: false, error: 'id 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const docRef = db.collection('blog_posts').doc(body.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const existingData = doc.data()!

    // 소유권 확인
    if (existingData.userId !== user.uid) {
      return NextResponse.json(
        { success: false, error: '이 게시글을 수정할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 수정 가능한 필드만 추출
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    }

    if (body.title !== undefined) {
      updateData.title = body.title
    }

    if (body.content !== undefined) {
      updateData.content = body.content
      updateData['metadata.wordCount'] = body.content.replace(/<[^>]*>/g, '').length
    }

    if (body.keywords !== undefined && Array.isArray(body.keywords)) {
      updateData.keywords = body.keywords
    }

    if (body.products !== undefined && Array.isArray(body.products)) {
      const validProducts = body.products.filter((p: any) => p.name && p.affiliateLink)
      updateData.products = validProducts
      // 제품 목록이 수정되면 postType도 자동으로 갱신
      updateData.postType = validProducts.length > 0 ? 'affiliate' : 'general'
    }

    if (body.slug !== undefined) {
      updateData.slug = body.slug
    }

    if (body.excerpt !== undefined) {
      updateData.excerpt = body.excerpt
    }

    if (body.status !== undefined && ['draft', 'published'].includes(body.status)) {
      updateData.status = body.status
    }

    // seoAnalysis 업데이트
    if (body.seoAnalysis !== undefined) {
      const seoResult = SeoAnalysisSchema.safeParse(body.seoAnalysis)
      if (!seoResult.success) {
        return NextResponse.json(
          { success: false, error: 'seoAnalysis 형식이 올바르지 않습니다.', details: seoResult.error.flatten() },
          { status: 400 }
        )
      }
      updateData.seoAnalysis = seoResult.data
    }

    // threads 부분 업데이트 (dot notation)
    if (body.threads !== undefined && typeof body.threads === 'object') {
      const threadsFields = ['text', 'hashtag', 'imageUrl', 'linkUrl', 'postStatus', 'threadsPostId', 'postedAt', 'errorMessage'] as const
      for (const field of threadsFields) {
        if (body.threads[field] !== undefined) {
          updateData[`threads.${field}`] = body.threads[field]
        }
      }
    }

    // wordpress 부분 업데이트 (dot notation)
    if (body.wordpress !== undefined && typeof body.wordpress === 'object') {
      const wpFields = ['slug', 'excerpt', 'commentStatus'] as const
      for (const field of wpFields) {
        if (body.wordpress[field] !== undefined) {
          updateData[`wordpress.${field}`] = body.wordpress[field]
        }
      }
    }

    await docRef.update(updateData)

    // 기존 데이터 + 업데이트 데이터 merge로 응답 구성 (재조회 불필요)
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
        updatedAt: updateData.updatedAt.toDate().toISOString(),
      },
      message: '게시글이 수정되었습니다.',
    })
  } catch (error) {
    console.error('Publish API PATCH error:', error)
    return NextResponse.json(
      { success: false, error: '게시글 수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: 게시글 삭제
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const user = await getUserByApiKey(apiKey)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id 파라미터는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const docRef = db.collection('blog_posts').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const data = doc.data()!

    // 소유권 확인
    if (data.userId !== user.uid) {
      return NextResponse.json(
        { success: false, error: '이 게시글을 삭제할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    await docRef.delete()

    return NextResponse.json({
      success: true,
      data: { id },
      message: '게시글이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('Publish API DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '게시글 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
