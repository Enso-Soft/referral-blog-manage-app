import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import {
  createThreadsContainer,
  publishThreadsContainer,
  waitForContainerReady,
} from '@/lib/threads-api'

// POST: Threads에 포스팅
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 1. 블로그 글 조회
    const postDoc = await db.collection('blog_posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()!

    // 소유권 확인
    if (postData.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 게시글에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // threads 데이터 확인
    if (!postData.threads?.text) {
      return NextResponse.json(
        { success: false, error: 'Threads 콘텐츠가 없습니다.' },
        { status: 400 }
      )
    }

    // 2. 사용자 Threads 토큰 확인
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.threadsAccessToken) {
      return NextResponse.json(
        { success: false, error: 'Threads 계정이 연결되어 있지 않습니다. 설정에서 연결해주세요.' },
        { status: 400 }
      )
    }

    // 토큰 만료 확인
    const expiresAt = userData.threadsTokenExpiresAt?.toDate?.()
    if (expiresAt && expiresAt < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Threads 토큰이 만료되었습니다. 설정에서 갱신해주세요.' },
        { status: 400 }
      )
    }

    const accessToken = userData.threadsAccessToken
    const threadsUserId = userData.threadsUserId

    // 3. Threads 포스팅
    try {
      // 텍스트 조합: 본문 + 해시태그
      let fullText = postData.threads.text
      if (postData.threads.hashtag) {
        fullText += '\n\n' + postData.threads.hashtag
      }

      // 미디어 타입 결정
      const mediaType = postData.threads.imageUrl ? 'IMAGE' as const : 'TEXT' as const

      // 컨테이너 생성
      const container = await createThreadsContainer({
        accessToken,
        userId: threadsUserId,
        text: fullText,
        mediaType,
        imageUrl: postData.threads.imageUrl,
        linkUrl: postData.threads.linkUrl,
      })

      // 컨테이너 준비 대기
      await waitForContainerReady(container.id, accessToken)

      // 게시
      const published = await publishThreadsContainer({
        accessToken,
        userId: threadsUserId,
        containerId: container.id,
      })

      // 성공: Firestore 업데이트
      await db.collection('blog_posts').doc(postId).update({
        'threads.postStatus': 'posted',
        'threads.threadsPostId': published.id,
        'threads.postedAt': Timestamp.now(),
        'threads.errorMessage': null,
        updatedAt: Timestamp.now(),
      })

      return NextResponse.json({
        success: true,
        data: {
          threadsPostId: published.id,
          postStatus: 'posted',
        },
        message: 'Threads에 포스팅되었습니다.',
      })
    } catch (postError) {
      // 실패: Firestore 업데이트
      const errorMessage = postError instanceof Error ? postError.message : '알 수 없는 오류'
      await db.collection('blog_posts').doc(postId).update({
        'threads.postStatus': 'failed',
        'threads.errorMessage': errorMessage,
        updatedAt: Timestamp.now(),
      })

      return NextResponse.json(
        { success: false, error: `Threads 포스팅 실패: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}
