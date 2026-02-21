import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAdmin } from '@/lib/api-error-handler'

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAdmin(auth)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''
    const perPage = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
    const lastId = searchParams.get('lastId') || ''

    const db = getDb()
    let query: FirebaseFirestore.Query = db.collection('users').orderBy('email')

    // role 필터는 Firestore 쿼리 레벨에서 적용 가능 (composite index 불필요 — email orderBy와 호환)
    if (role && (role === 'admin' || role === 'user')) {
      query = query.where('role', '==', role)
    }

    // status === 'blocked'만 Firestore 레벨 적용 (status 필드 없는 기존 유저가 있으므로 'active' 필터는 인메모리)
    if (status === 'blocked') {
      query = query.where('status', '==', 'blocked')
    }

    // 커서 기반 페이지네이션
    if (lastId) {
      const lastDoc = await db.collection('users').doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(perPage)

    const snapshot = await query.get()

    // 1단계: 인메모리 필터 적용 (search, status=active)
    let filteredDocs = snapshot.docs

    if (search) {
      const searchLower = search.toLowerCase()
      filteredDocs = filteredDocs.filter((doc) => {
        const data = doc.data()
        const email = (data.email || '').toLowerCase()
        const displayName = (data.displayName || '').toLowerCase()
        return email.includes(searchLower) || displayName.includes(searchLower)
      })
    }

    if (status === 'active') {
      filteredDocs = filteredDocs.filter((doc) => {
        const data = doc.data()
        return !data.status || data.status === 'active'
      })
    }

    // 2단계: 필터 통과한 유저에 대해서만 count() 쿼리 실행
    const users = await Promise.all(
      filteredDocs.map(async (doc) => {
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
    return handleApiError(error)
  }
}
