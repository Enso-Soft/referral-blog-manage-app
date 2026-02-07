import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromApiKey } from '@/lib/auth-admin'
import { AIWriteOptionsSchema } from '@/lib/schemas/aiRequest'
import { z } from 'zod'

// POST: AI 글 작성 요청 생성
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // 검증
    const schema = z.object({
      prompt: z.string().min(1, '프롬프트를 입력해주세요'),
      options: AIWriteOptionsSchema,
      images: z.array(z.string()).optional(),
    })

    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || '잘못된 요청입니다.' },
        { status: 400 }
      )
    }

    const { prompt, options, images } = parsed.data

    const db = getDb()
    const now = Timestamp.now()

    const docData = {
      userId: auth.userId,
      userEmail: auth.email,
      prompt,
      images: images || [],
      options,
      status: 'pending' as const,
      createdAt: now,
    }

    const docRef = await db.collection('ai_write_requests').add(docData)

    return NextResponse.json({
      success: true,
      data: {
        id: docRef.id,
        status: 'pending',
        createdAt: now.toDate().toISOString(),
      },
      message: 'AI 글 작성 요청이 생성되었습니다.',
    })
  } catch (error) {
    console.error('AI Requests API POST error:', error)
    return NextResponse.json(
      { success: false, error: 'AI 글 작성 요청 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// GET: AI 글 작성 요청 조회 (단건 또는 목록)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const db = getDb()

    // 단건 조회
    if (id) {
      const docRef = db.collection('ai_write_requests').doc(id)
      const doc = await docRef.get()

      if (!doc.exists) {
        return NextResponse.json(
          { success: false, error: '요청을 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      const data = doc.data()!

      if (data.userId !== auth.userId) {
        return NextResponse.json(
          { success: false, error: '이 요청에 접근할 권한이 없습니다.' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
          prompt: data.prompt,
          options: data.options,
          status: data.status,
          progressMessage: data.progressMessage || null,
          resultPostId: data.resultPostId || null,
          errorMessage: data.errorMessage || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        },
      })
    }

    // 목록 조회
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const status = searchParams.get('status')

    let query = db.collection('ai_write_requests')
      .where('userId', '==', auth.userId)
      .orderBy('createdAt', 'desc')

    if (status && ['pending', 'success', 'failed'].includes(status)) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.limit(limit).offset((page - 1) * limit).get()

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        prompt: data.prompt?.substring(0, 100) || '',
        status: data.status,
        progressMessage: data.progressMessage || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      }
    })

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        count: requests.length,
      },
    })
  } catch (error) {
    console.error('AI Requests API GET error:', error)
    return NextResponse.json(
      { success: false, error: '요청 조회에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PATCH: AI 글 작성 요청 상태/진행 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
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
    const docRef = db.collection('ai_write_requests').doc(body.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const existingData = doc.data()!

    if (existingData.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 요청을 수정할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 업데이트 가능한 필드만 추출
    const updateData: Record<string, any> = {}

    if (body.status !== undefined && ['pending', 'success', 'failed'].includes(body.status)) {
      updateData.status = body.status
      // 완료 상태로 변경 시 completedAt 자동 설정
      if (body.status === 'success' || body.status === 'failed') {
        updateData.completedAt = Timestamp.now()
      }
    }

    if (body.progressMessage !== undefined) {
      updateData.progressMessage = body.progressMessage
    }

    if (body.resultPostId !== undefined) {
      updateData.resultPostId = body.resultPostId
    }

    if (body.errorMessage !== undefined) {
      updateData.errorMessage = body.errorMessage
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 필드가 없습니다.' },
        { status: 400 }
      )
    }

    await docRef.update(updateData)

    const updatedDoc = await docRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        status: updatedData.status,
        progressMessage: updatedData.progressMessage || null,
        resultPostId: updatedData.resultPostId || null,
        errorMessage: updatedData.errorMessage || null,
        createdAt: updatedData.createdAt?.toDate?.()?.toISOString() || null,
        completedAt: updatedData.completedAt?.toDate?.()?.toISOString() || null,
      },
      message: '요청이 업데이트되었습니다.',
    })
  } catch (error) {
    console.error('AI Requests API PATCH error:', error)
    return NextResponse.json(
      { success: false, error: '요청 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE: AI 글 작성 요청 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
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
    const docRef = db.collection('ai_write_requests').doc(id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '요청을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const data = doc.data()!

    if (data.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 요청을 삭제할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    await docRef.delete()

    return NextResponse.json({
      success: true,
      data: { id },
      message: '요청이 삭제되었습니다.',
    })
  } catch (error) {
    console.error('AI Requests API DELETE error:', error)
    return NextResponse.json(
      { success: false, error: '요청 삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
