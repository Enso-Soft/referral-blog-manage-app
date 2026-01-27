import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth, requireResource } from '@/lib/api-error-handler'

const AI_API_URL = process.env.AI_EDITOR_API_URL || 'https://api.enso-soft.xyz/v1/ai/blog-editor'
const AI_API_KEY = process.env.AI_API_KEY

// POST: AI 글 수정 대화
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const body = await request.json()
    const { postId, message, messageId, isRetry } = body

    if (!postId || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 포스트 존재 확인 및 권한 검증
    const postRef = db.collection('blog_posts').doc(postId)
    const postDoc = await postRef.get()
    requireResource(postDoc.exists, '글을 찾을 수 없습니다')

    const postData = postDoc.data()
    if (postData?.userId !== auth.userId && !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: '이 글에 대한 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 대화 이력 가져오기 (컨텍스트 제공용)
    const conversationsRef = postRef.collection('conversations')
    const conversationsSnap = await conversationsRef.orderBy('createdAt', 'asc').get()
    const conversationHistory = conversationsSnap.docs.map(doc => ({
      role: doc.data().role,
      content: doc.data().content,
    })).filter(msg => msg.content && msg.role) // 빈 메시지 필터링

    // AI API 호출
    if (!AI_API_KEY) {
      return NextResponse.json({
        success: true,
        response: 'AI API 키가 설정되지 않았습니다. 관리자에게 문의해주세요.',
      })
    }

    try {
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': AI_API_KEY,
        },
        body: JSON.stringify({
          postId,
          message: message.trim(),
          postContent: postData?.content,
          postTitle: postData?.title,
          conversationHistory,
          isRetry: isRetry || false,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || `AI API 오류: ${response.status}`)
      }

      const result = await response.json()

      // AI가 글을 수정한 경우 Firestore 업데이트
      if (result.updatedContent) {
        await postRef.update({
          content: result.updatedContent,
          updatedAt: Timestamp.now(),
        })
      }

      return NextResponse.json({
        success: true,
        response: result.response || result.message || '수정이 완료되었습니다.',
        contentUpdated: !!result.updatedContent,
      })
    } catch (apiError) {
      console.error('AI API Error:', apiError)
      return NextResponse.json({
        success: false,
        error: apiError instanceof Error ? apiError.message : 'AI 서버 연결에 실패했습니다',
      }, { status: 502 })
    }
  } catch (error) {
    return handleApiError(error)
  }
}
