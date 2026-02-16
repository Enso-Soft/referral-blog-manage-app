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
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const perPage = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const lastId = searchParams.get('lastId') || ''

    const db = getDb()
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('email')

    // 커서 기반 페이지네이션
    if (lastId) {
      const lastDoc = await db.collection('users').doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(perPage)

    const snapshot = await query.get()

    // 각 사용자별 postCount, productCount 병렬 조회
    let users = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()

        const [postsCountSnapshot, productsCountSnapshot] = await Promise.all([
          db.collection('blog_posts').where('userId', '==', doc.id).count().get(),
          db.collection('products').where('userId', '==', doc.id).count().get(),
        ])

        return {
          id: doc.id,
          email: data.email || '',
          displayName: data.displayName || '',
          role: data.role || 'user',
          status: data.status || 'active',
          postCount: postsCountSnapshot.data().count,
          productCount: productsCountSnapshot.data().count,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        }
      })
    )

    // 검색 필터 (email 또는 displayName)
    if (search) {
      const searchLower = search.toLowerCase()
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(searchLower) ||
          u.displayName.toLowerCase().includes(searchLower)
      )
    }

    // 역할 필터
    if (role && (role === 'admin' || role === 'user')) {
      users = users.filter((u) => u.role === role)
    }

    // 상태 필터
    if (status && (status === 'active' || status === 'blocked')) {
      users = users.filter((u) => u.status === status)
    }

    const lastDoc = snapshot.docs[snapshot.docs.length - 1]

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        limit: perPage,
        count: users.length,
        lastId: lastDoc?.id || null,
        hasMore: snapshot.docs.length === perPage,
      },
    })
  } catch (error) {
    console.error('GET users error:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
