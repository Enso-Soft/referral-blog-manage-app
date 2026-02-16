import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { CreateAIWriteRequestSchema } from '@/lib/schemas/aiRequest'

const AI_API_URL = process.env.AI_API_URL || 'https://api.enso-soft.xyz/v1/ai/blog-writer'

// POST: AI 블로그 작성 요청
export async function POST(request: NextRequest) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    // FormData 파싱
    const formData = await request.formData()
    const prompt = formData.get('prompt') as string
    const optionsStr = formData.get('options') as string

    if (!prompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '프롬프트를 입력해주세요' },
        { status: 400 }
      )
    }

    // 옵션 파싱
    let options
    try {
      options = JSON.parse(optionsStr || '{}')
    } catch {
      options = { platform: 'tistory' }
    }

    // 이미지 처리 (base64로 변환)
    const imageDataUrls: string[] = []
    const entries = Array.from(formData.entries())
    for (const [key, value] of entries) {
      if (key.startsWith('image_') && value instanceof File) {
        const buffer = await value.arrayBuffer()
        const base64 = Buffer.from(buffer).toString('base64')
        const mimeType = value.type || 'image/jpeg'
        imageDataUrls.push(`data:${mimeType};base64,${base64}`)
      }
    }

    // Zod 검증
    const validatedData = CreateAIWriteRequestSchema.parse({
      prompt: prompt.trim(),
      images: imageDataUrls,
      options,
    })

    const db = getDb()

    // API 키 검증 (getAuthFromRequest에서 캐싱된 데이터 사용)
    const userApiKey = auth.apiKey

    if (!userApiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 발급되지 않았습니다. 설정 페이지에서 API 키를 발급해주세요.' },
        { status: 400 }
      )
    }

    const now = Timestamp.now()

    // Firestore에 요청 저장 (pending 상태)
    const docData = {
      userId: auth.userId,
      userEmail: auth.email,
      prompt: validatedData.prompt,
      options: validatedData.options,
      status: 'pending' as const,
      progressMessage: 'AI가 요청을 분석하고 있어요',
      createdAt: now,
    }

    const docRef = await db.collection('ai_write_requests').add(docData)

    // AI API 호출 (Lambda 환경에서는 응답 반환 후 동결되므로 await 필수)
    await callAIApi(docRef.id, validatedData, auth.userId, userApiKey)

    return NextResponse.json({
      success: true,
      requestId: docRef.id,
      message: '요청이 접수되었습니다. 완료 시 알림을 보내드립니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// 외부 AI API 호출 (백그라운드)
async function callAIApi(
  requestId: string,
  data: { prompt: string; images: string[]; options: unknown },
  userId: string,
  apiKey: string
) {
  const db = getDb()
  const requestRef = db.collection('ai_write_requests').doc(requestId)

  try {
    const requestBody = {
      requestId,
      userId,
      prompt: data.prompt,
      images: data.images,
      options: data.options,
    }
    console.log('[AI API] 요청 URL:', AI_API_URL)
    console.log('[AI API] 요청 body:', JSON.stringify({ ...requestBody, images: `[${data.images.length}개 이미지]` }))

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    console.log('[AI API] 응답 status:', response.status)

    const responseBody = await response.json().catch(() => ({}))
    console.log('[AI API] 응답 body:', JSON.stringify(responseBody))

    // 실패 응답: statusCode !== 200, body: {"detail": "에러 메시지"}
    if (!response.ok) {
      console.error(`[AI API] 요청 거부 (${response.status}):`, responseBody.detail || JSON.stringify(responseBody))
      throw new Error(responseBody.detail || `AI API 오류: ${response.status}`)
    }

    if (!responseBody.success) {
      throw new Error(responseBody.detail || 'AI API 응답이 올바르지 않습니다')
    }

    // 요청 전달 성공 - pending 상태 유지 (Firestore 업데이트 불필요)
  } catch (error) {
    console.error('[AI API] 에러:', error instanceof Error ? error.message : error)
    // 실패 시 Firestore 업데이트
    await requestRef.update({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      completedAt: Timestamp.now(),
    })
  }
}

// PATCH: AI 요청 숨김 (dismissed)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '요청 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const db = getDb()
    const requestRef = db.collection('ai_write_requests').doc(id)
    const requestDoc = await requestRef.get()

    if (!requestDoc.exists) {
      return NextResponse.json(
        { success: false, error: '요청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const requestData = requestDoc.data()
    if (requestData?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    await requestRef.update({ dismissed: true })

    return NextResponse.json({
      success: true,
      message: '요청이 숨김 처리되었습니다',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: AI 요청 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('id')

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: '요청 ID가 필요합니다' },
        { status: 400 }
      )
    }

    const db = getDb()
    const requestRef = db.collection('ai_write_requests').doc(requestId)
    const requestDoc = await requestRef.get()

    if (!requestDoc.exists) {
      return NextResponse.json(
        { success: false, error: '요청을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 본인 요청인지 확인
    const requestData = requestDoc.data()
    if (requestData?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다' },
        { status: 403 }
      )
    }

    // 영구 삭제
    await requestRef.delete()

    return NextResponse.json({
      success: true,
      message: '요청이 삭제되었습니다',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: AI 요청 이력 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const lastId = searchParams.get('lastId')

    const db = getDb()
    const requestsRef = db.collection('ai_write_requests')
    let query: FirebaseFirestore.Query = requestsRef
      .where('userId', '==', auth.userId)
      .orderBy('createdAt', 'desc')

    if (lastId) {
      const lastDoc = await requestsRef.doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    }

    query = query.limit(limit)

    const snapshot = await query.get()
    const requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({
      success: true,
      requests,
      hasMore: requests.length === limit,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
