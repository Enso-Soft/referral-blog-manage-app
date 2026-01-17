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

    const db = getDb()

    // 통계 쿼리들을 병렬로 실행
    const [
      usersCountSnapshot,
      draftPostsCountSnapshot,
      publishedPostsCountSnapshot,
      productsCountSnapshot,
      recentUsersSnapshot,
      recentPostsSnapshot,
    ] = await Promise.all([
      // 총 사용자 수
      db.collection('users').count().get(),
      // draft 글 수
      db.collection('blog_posts').where('status', '==', 'draft').count().get(),
      // published 글 수
      db.collection('blog_posts').where('status', '==', 'published').count().get(),
      // 총 제품 수
      db.collection('products').count().get(),
      // 최근 가입 사용자 5명
      db.collection('users').orderBy('createdAt', 'desc').limit(5).get(),
      // 최근 작성 글 5개
      db.collection('blog_posts').orderBy('createdAt', 'desc').limit(5).get(),
    ])

    const recentUsers = recentUsersSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        displayName: data.displayName,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })

    const recentPosts = recentPostsSnapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        title: data.title,
        status: data.status,
        userId: data.userId,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      }
    })

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: usersCountSnapshot.data().count,
        totalPosts: {
          draft: draftPostsCountSnapshot.data().count,
          published: publishedPostsCountSnapshot.data().count,
          total: draftPostsCountSnapshot.data().count + publishedPostsCountSnapshot.data().count,
        },
        totalProducts: productsCountSnapshot.data().count,
      },
      recentUsers,
      recentPosts,
    })
  } catch (error) {
    console.error('GET stats error:', error)
    return NextResponse.json(
      { success: false, error: '통계 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}
