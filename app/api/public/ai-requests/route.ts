import { NextRequest, NextResponse } from 'next/server'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { getOwnedDocument } from '@/lib/api-helpers'
import { settleAIRequest } from '@/lib/credit-operations'
import { logger } from '@/lib/logger'

// GET: AI 글 작성 요청 조회 (단건 또는 목록)
export const GET = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const db = getDb()

  // 단건 조회
  if (id) {
    const { data, doc } = await getOwnedDocument('ai_write_requests', id, auth!, '요청')

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
    .where('userId', '==', auth!.userId)
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
})

// PATCH: AI 글 작성 요청 상태/진행 업데이트
export const PATCH = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const body = await request.json()

  if (!body.id) {
    return NextResponse.json(
      { success: false, error: 'id 필드는 필수입니다.' },
      { status: 400 }
    )
  }

  const { docRef, data: existingData } = await getOwnedDocument('ai_write_requests', body.id, auth!, '요청')

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

  // 크레딧 정산: status가 success/failed로 변경되고, preCharge가 있고, 아직 정산되지 않았으면
  if (
    (body.status === 'success' || body.status === 'failed') &&
    existingData.preCharge &&
    !existingData.settlement?.settled
  ) {
    try {
      const actualCost = body.actualCost ?? existingData.preCharge.totalAmount
      await settleAIRequest(body.id, actualCost, body.status)
    } catch (settleErr) {
      logger.error(`[AI Requests] 크레딧 정산 실패 (requestId: ${body.id}):`, settleErr)
    }
  }

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
})

// DELETE: AI 글 작성 요청 삭제
export const DELETE = createApiHandler({ auth: 'apiKey' }, async (request: NextRequest, { auth }) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'id 파라미터는 필수입니다.' },
      { status: 400 }
    )
  }

  const { docRef } = await getOwnedDocument('ai_write_requests', id, auth!, '요청')

  await docRef.delete()

  return NextResponse.json({
    success: true,
    data: { id },
    message: '요청이 삭제되었습니다.',
  })
})
