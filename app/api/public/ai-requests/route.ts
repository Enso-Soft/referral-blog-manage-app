import { NextRequest, NextResponse } from 'next/server'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromApiKey } from '@/lib/auth-admin'
import { handleApiError, requireAuth, requireResource, requirePermission } from '@/lib/api-error-handler'

// GET: AI 글 작성 요청 조회 (단건 또는 목록)
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    requireAuth(auth)

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const db = getDb()

    // 단건 조회
    if (id) {
      const docRef = db.collection('ai_write_requests').doc(id)
      const doc = await docRef.get()
      requireResource(doc.exists, '요청을 찾을 수 없습니다.')

      const data = doc.data()!
      requirePermission(data.userId === auth.userId, '이 요청에 접근할 권한이 없습니다.')

      return NextResponse.json({
        success: true,
        data: {
          id: doc.id,
          prompt: data.prompt,
          options: data.options,
          status: data.status,
          progressMessage: data.progressMessage || null,
          progressMessages: (data.progressMessages || []).map((entry: { message: string; timestamp: FirebaseFirestore.Timestamp }) => ({
            message: entry.message,
            timestamp: entry.timestamp?.toDate?.()?.toISOString() || null,
          })),
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
    const lastId = searchParams.get('lastId')
    const status = searchParams.get('status')

    let query = db.collection('ai_write_requests')
      .where('userId', '==', auth.userId)
      .orderBy('createdAt', 'desc')

    if (status && ['pending', 'success', 'failed'].includes(status)) {
      query = query.where('status', '==', status)
    }

    // 커서 기반 페이지네이션 (lastId 우선, 없으면 page 기반 하위 호환)
    if (lastId) {
      const lastDoc = await db.collection('ai_write_requests').doc(lastId).get()
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc)
      }
    } else if (page > 1) {
      query = query.offset((page - 1) * limit)
    }

    const snapshot = await query.limit(limit).get()

    const requests = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        prompt: data.prompt?.substring(0, 100) || '',
        status: data.status,
        progressMessage: data.progressMessage || null,
        progressMessages: (data.progressMessages || []).map((entry: { message: string; timestamp: FirebaseFirestore.Timestamp }) => ({
          message: entry.message,
          timestamp: entry.timestamp?.toDate?.()?.toISOString() || null,
        })),
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      }
    })

    const lastDoc = snapshot.docs[snapshot.docs.length - 1]

    return NextResponse.json({
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        count: requests.length,
        lastId: lastDoc?.id || null,
        hasMore: snapshot.docs.length === limit,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: AI 글 작성 요청 상태/진행 업데이트
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    requireAuth(auth)

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
    requireResource(doc.exists, '요청을 찾을 수 없습니다.')

    const existingData = doc.data()!
    requirePermission(existingData.userId === auth.userId, '이 요청을 수정할 권한이 없습니다.')

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
      // progressMessages 배열에 타임스탬프와 함께 누적
      updateData.progressMessages = FieldValue.arrayUnion({
        message: body.progressMessage,
        timestamp: Timestamp.now(),
      })
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

    // 기존 데이터 + 업데이트 데이터 merge로 응답 구성 (재조회 불필요)
    const mergedData = { ...existingData, ...updateData }

    // PATCH 응답: progressMessages는 재조회 필요 (FieldValue.arrayUnion은 merge 불가)
    const updatedDoc = await docRef.get()
    const updatedData = updatedDoc.data()!

    return NextResponse.json({
      success: true,
      data: {
        id: body.id,
        status: updatedData.status,
        progressMessage: updatedData.progressMessage || null,
        progressMessages: (updatedData.progressMessages || []).map((entry: { message: string; timestamp: FirebaseFirestore.Timestamp }) => ({
          message: entry.message,
          timestamp: entry.timestamp?.toDate?.()?.toISOString() || null,
        })),
        resultPostId: updatedData.resultPostId || null,
        errorMessage: updatedData.errorMessage || null,
        createdAt: existingData.createdAt?.toDate?.()?.toISOString() || null,
        completedAt: updatedData.completedAt?.toDate?.()?.toISOString() || null,
      },
      message: '요청이 업데이트되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: AI 글 작성 요청 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromApiKey(request)
    requireAuth(auth)

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
    requireResource(doc.exists, '요청을 찾을 수 없습니다.')

    const data = doc.data()!
    requirePermission(data.userId === auth.userId, '이 요청을 삭제할 권한이 없습니다.')

    await docRef.delete()

    return NextResponse.json({
      success: true,
      data: { id },
      message: '요청이 삭제되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
