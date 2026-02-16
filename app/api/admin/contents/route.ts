import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const userId = searchParams.get('userId') || ''
    const search = searchParams.get('search') || ''
    const perPage = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const lastId = searchParams.get('lastId') || ''

    const db = getDb()
    let query: FirebaseFirestore.Query = db.collection('blog_posts')

    // 상태 필터 (Firestore에서 직접 처리)
    if (status && (status === 'draft' || status === 'published')) {
      query = query.where('status', '==', status)
    }

    // 작성자 필터 (Firestore에서 직접 처리)
    if (userId) {
      query = query.where('userId', '==', userId)
    }

    query = query.orderBy('createdAt', 'desc')

    // 커서 기반 페이지네이션
    if (lastId) {
      const lastDoc = await db.collection('blog_posts').doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(perPage)

    const snapshot = await query.get()

    // 사용자 정보 일괄 조회 (getAll로 단일 요청)
    const userIds = Array.from(new Set(snapshot.docs.map((doc) => doc.data().userId).filter(Boolean)))
    const usersMap = new Map<string, { email: string; displayName: string } | null>()

    if (userIds.length > 0) {
      const userRefs = userIds.map((uid) => db.collection('users').doc(uid))
      const userDocs = await db.getAll(...userRefs)
      userDocs.forEach((doc) => {
        usersMap.set(
          doc.id,
          doc.exists ? { email: doc.data()?.email, displayName: doc.data()?.displayName } : null
        )
      })
    }

    let contents = snapshot.docs.map((doc) => {
      const data = doc.data()
      const userData = usersMap.get(data.userId)
      return {
        id: doc.id,
        title: data.title || '',
        status: data.status || 'draft',
        platform: data.platform || 'tistory',
        userId: data.userId || '',
        userEmail: userData?.email || '',
        userDisplayName: userData?.displayName || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
      }
    })

    // 제목 검색 (메모리에서 처리)
    if (search) {
      const searchLower = search.toLowerCase()
      contents = contents.filter((c) => c.title.toLowerCase().includes(searchLower))
    }

    // 작성자 목록 (필터용)
    const authors = Array.from(usersMap.entries())
      .filter(([, userData]) => userData !== null)
      .map(([id, userData]) => ({
        id,
        email: userData!.email,
        displayName: userData!.displayName,
      }))

    const lastDoc = snapshot.docs[snapshot.docs.length - 1]

    return NextResponse.json({
      success: true,
      contents,
      authors,
      pagination: {
        limit: perPage,
        count: contents.length,
        lastId: lastDoc?.id || null,
        hasMore: snapshot.docs.length === perPage,
      },
    })
  } catch (error) {
    console.error('GET contents error:', error)
    return NextResponse.json(
      { success: false, error: '콘텐츠 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
