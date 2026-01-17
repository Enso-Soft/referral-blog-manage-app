import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'

// GET: 포스트 목록 조회
export async function GET(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '20')
    const lastId = searchParams.get('lastId')

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

    // 전체 개수 조회
    const countSnapshot = await query.count().get()
    const total = countSnapshot.data().count

    // 커서 기반 페이지네이션
    if (lastId) {
      const lastDoc = await postsRef.doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(limit)

    const snapshot = await query.get()
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    const hasMore = posts.length === limit

    return NextResponse.json({ success: true, posts, total, hasMore })
  } catch (error) {
    console.error('GET posts error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { success: false, error: '포스트 목록 조회에 실패했습니다', details: errorMessage },
      { status: 500 }
    )
  }
}

// POST: 새 포스트 생성
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const db = getDb()

    const now = Timestamp.now()
    const products = Array.isArray(body.products)
      ? body.products.filter((p: any) => p.name && p.affiliateLink)
      : []

    const docData = {
      userId: auth.userId,
      userEmail: auth.email,
      title: body.title || '제목 없음',
      content: body.content || '',
      keywords: body.keywords || [],
      products,
      status: body.status || 'draft',
      createdAt: now,
      updatedAt: now,
      metadata: body.metadata || { wordCount: 0 },
    }

    const docRef = await db.collection('blog_posts').add(docData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
    })
  } catch (error) {
    console.error('POST post error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
