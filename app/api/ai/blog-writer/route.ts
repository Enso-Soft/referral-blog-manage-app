import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import sharp from 'sharp'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth, requireResource, requirePermission } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'
import { CreateAIWriteRequestSchema } from '@/lib/schemas/aiRequest'
import { validateImageBuffer } from '@/lib/file-validation'
import { getS3Config } from '@/lib/env'
import { getCreditSettings, deductCredits, settleAIRequest } from '@/lib/credit-operations'

const AI_API_URL = process.env.AI_API_URL || 'https://api.enso-soft.xyz/v1/ai/blog-writer'

function createS3Client() {
  const config = getS3Config()
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })
}

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

    // 이미지 처리: WebP 변환 → S3 업로드 (URL) + base64 (AI API용) — 병렬 처리
    const entries = Array.from(formData.entries())
    const s3Config = getS3Config()
    const s3Client = createS3Client()
    const dateFolder = format(new Date(), 'yyyy/MM/dd')

    const imageFiles = entries.filter(([key, value]) => key.startsWith('image_') && value instanceof File) as [string, File][]

    const imageResults = await Promise.all(
      imageFiles.map(async ([, file]) => {
        const buffer = Buffer.from(await file.arrayBuffer())

        // Magic byte 검증 (MIME 위조 방지)
        if (!validateImageBuffer(buffer, file.type)) {
          throw new Error(`이미지 파일의 내용이 선언된 형식(${file.type})과 일치하지 않습니다`)
        }

        const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer()

        const uniqueId = uuidv4().slice(0, 8)
        const s3Key = `ai_request/${dateFolder}/${uniqueId}.webp`

        await s3Client.send(
          new PutObjectCommand({
            Bucket: s3Config.bucket,
            Key: s3Key,
            Body: webpBuffer,
            ContentType: 'image/webp',
          })
        )

        return {
          url: `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${s3Key}`,
          base64: `data:image/webp;base64,${webpBuffer.toString('base64')}`,
        }
      })
    )

    const imageUrls = imageResults.map(r => r.url)
    const imageBase64s = imageResults.map(r => r.base64)

    // Zod 검증
    const validatedData = CreateAIWriteRequestSchema.parse({
      prompt: prompt.trim(),
      images: imageUrls,
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

    // 크레딧 선결제
    const settings = await getCreditSettings()
    const preChargeAmount = settings.aiWritePreChargeAmount

    let preChargeResult: Awaited<ReturnType<typeof deductCredits>>
    try {
      preChargeResult = await deductCredits(
        auth.userId,
        preChargeAmount,
        'debit',
        `AI 글 작성 선결제 (${preChargeAmount.toLocaleString()})`,
        undefined,
        'ai_write_request'
      )
    } catch (err: any) {
      if (err.code === 'INSUFFICIENT_CREDIT') {
        return NextResponse.json(
          { success: false, error: '크레딧이 부족합니다. 충전 후 다시 시도해주세요.', code: 'INSUFFICIENT_CREDIT' },
          { status: 402 }
        )
      }
      throw err
    }

    const now = Timestamp.now()

    // Firestore에 요청 저장 (pending 상태 + preCharge 정보)
    const initialProgressMessage = 'AI가 요청을 분석하고 있어요'
    const docData = {
      userId: auth.userId,
      userEmail: auth.email,
      prompt: validatedData.prompt,
      images: validatedData.images,
      options: validatedData.options,
      status: 'pending' as const,
      progressMessage: initialProgressMessage,
      progressMessages: [{ message: initialProgressMessage, timestamp: now }],
      preCharge: {
        totalAmount: preChargeAmount,
        sCreditCharged: preChargeResult.sCreditUsed,
        eCreditCharged: preChargeResult.eCreditUsed,
        transactionId: preChargeResult.transactionId,
      },
      createdAt: now,
    }

    const docRef = await db.collection('ai_write_requests').add(docData)

    // 선결제 트랜잭션에 referenceId 업데이트
    await db.collection('credit_transactions').doc(preChargeResult.transactionId).update({
      referenceId: docRef.id,
    })

    // AI API 호출 (base64 이미지 전달 — 백엔드 호환)
    await callAIApi(docRef.id, { ...validatedData, images: imageBase64s }, auth.userId, userApiKey)

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
    logger.debug('[AI API] 요청:', AI_API_URL, `이미지 ${data.images.length}개`)

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(requestBody),
    })

    logger.debug('[AI API] 응답 status:', response.status)

    const responseBody = await response.json().catch(() => ({}))

    // 실패 응답: statusCode !== 200, body: {"detail": "에러 메시지"}
    if (!response.ok) {
      logger.error(`[AI API] 요청 거부 (${response.status})`, responseBody.detail)
      throw new Error(responseBody.detail || `AI API 오류: ${response.status}`)
    }

    if (!responseBody.success) {
      throw new Error(responseBody.detail || 'AI API 응답이 올바르지 않습니다')
    }

    // 요청 전달 성공 - pending 상태 유지 (Firestore 업데이트 불필요)
  } catch (error) {
    logger.error('[AI API] 에러:', error)
    // 실패 시 Firestore 업데이트
    await requestRef.update({
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다',
      completedAt: Timestamp.now(),
    })
    // AI API 호출 실패 시 즉시 정산 (전액 환급)
    try {
      await settleAIRequest(requestId, 0, 'failed')
    } catch (settleErr) {
      logger.error('[AI API] 정산(환급) 실패:', settleErr)
      // 정산 실패를 문서에 기록 → Admin에서 조회 가능
      await requestRef.update({
        'settlement.error': settleErr instanceof Error ? settleErr.message : '정산 실패',
        'settlement.failedAt': Timestamp.now(),
      }).catch(() => {}) // 이 업데이트 자체가 실패해도 무시
    }
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
    requireResource(requestDoc.exists, '요청을 찾을 수 없습니다')

    const requestData = requestDoc.data()
    requirePermission(auth.userId === requestData?.userId, '권한이 없습니다')

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
    requireResource(requestDoc.exists, '요청을 찾을 수 없습니다')

    // 본인 요청인지 확인
    const requestData = requestDoc.data()
    requirePermission(auth.userId === requestData?.userId, '권한이 없습니다')

    // 미정산 선결제가 있으면 환불 처리
    if (requestData?.preCharge && !requestData?.settlement?.settled) {
      try {
        await settleAIRequest(requestId, 0, 'failed')
      } catch (err) {
        logger.error('[AI DELETE] 환불 실패:', err)
      }
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
