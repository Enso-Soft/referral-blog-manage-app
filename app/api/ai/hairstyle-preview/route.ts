import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import sharp from 'sharp'
import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth, requireResource, requirePermission } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'
import { validateImageBuffer } from '@/lib/file-validation'
import { getS3Config } from '@/lib/env'
import { getCreditSettings, deductCredits, settleAIRequest } from '@/lib/credit-operations'
import { HairstyleOptionsSchema, type HairstyleOptions } from '@/lib/schemas/hairstyleRequest'

export const maxDuration = 120 // 2분 타임아웃

const COLLECTION_NAME = 'ai_hairstyle_requests'

// 모듈 레벨 싱글턴 (콜드 스타트 시 1회 생성)
let _s3Client: S3Client | null = null
function getS3Client() {
  if (!_s3Client) {
    const config = getS3Config()
    _s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }
  return _s3Client
}

function buildS3Url(bucket: string, region: string, key: string) {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

async function uploadToS3(
  webpBuffer: Buffer,
  dateFolder: string,
  prefix: string,
  options?: { resize?: boolean }
): Promise<{ url: string; buffer: Buffer; width: number; height: number }> {
  const s3Config = getS3Config()
  const s3Client = getS3Client()

  const { data: finalBuffer, info } = options?.resize !== false
    ? await sharp(webpBuffer).resize({ width: 1024, height: 1024, fit: 'inside' }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true })
    : await sharp(webpBuffer).webp({ quality: 85 }).toBuffer({ resolveWithObject: true })

  const uniqueId = uuidv4().slice(0, 8)
  const s3Key = `ai_hairstyle/${dateFolder}/${prefix}_${uniqueId}.webp`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: s3Key,
      Body: finalBuffer,
      ContentType: 'image/webp',
    })
  )

  return {
    url: buildS3Url(s3Config.bucket, s3Config.region, s3Key),
    buffer: finalBuffer,
    width: info.width,
    height: info.height,
  }
}

// Gemini SDK 지원 aspect ratio만 포함 (4:5, 5:4 등은 미지원)
type GeminiAspectRatio = '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9'

const SUPPORTED_ASPECT_RATIOS: readonly { label: GeminiAspectRatio; value: number }[] = [
  { label: '9:16', value: 9 / 16 },
  { label: '2:3', value: 2 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:2', value: 3 / 2 },
  { label: '16:9', value: 16 / 9 },
  { label: '21:9', value: 21 / 9 },
]

function detectAspectRatio(width: number, height: number): GeminiAspectRatio {
  const ratio = width / height
  let closestLabel: GeminiAspectRatio = SUPPORTED_ASPECT_RATIOS[0].label
  let minDiff = Math.abs(ratio - SUPPORTED_ASPECT_RATIOS[0].value)
  for (const ar of SUPPORTED_ASPECT_RATIOS) {
    const diff = Math.abs(ratio - ar.value)
    if (diff < minDiff) {
      minDiff = diff
      closestLabel = ar.label
    }
  }
  return closestLabel
}

function buildGeminiPrompt(
  hasHairstyleImage: boolean,
  textPrompt: string | null,
  additionalPrompt: string | null,
  options: {
    faceMosaic: boolean
    creativityLevel?: 'strict' | 'balanced' | 'creative'
  }
): string {
  const creativity = options.creativityLevel ?? 'balanced'
  // 핵심 프롬프트: 간결하게 (성공 사례 기반)
  const preamble = hasHairstyleImage
    ? 'Keep the person in the first image exactly as they are'
    : 'Keep this person exactly as they are'
  const hairInstruction = hasHairstyleImage
    ? 'Only replace the hairstyle, using the second image as hair reference.'
    : `Only change the hairstyle to: ${textPrompt}.`
  const suffix = "Adapt the new hair naturally to fit the person's head shape, with realistic lighting and shadows. Maintain full likeness and photo-realistic skin texture."

  let prompt = `${preamble} — same face, body, pose, outfit, and background. Do not change the framing, zoom, or face size. ${hairInstruction} ${suffix}`

  // creativity별 짧은 추가 지시
  const creativityAddon = {
    strict: hasHairstyleImage
      ? ' Copy the exact cut, length, volume, parting, and color from the hair reference.'
      : ' Follow this description precisely.',
    balanced: '',
    creative: hasHairstyleImage
      ? ' You may freely adjust hair length, volume, and styling to suit the face, using the reference as inspiration for the hair only.'
      : ' You may freely adjust hair length, volume, and styling to better suit the face.',
  } as const

  if (creativityAddon[creativity]) {
    prompt += creativityAddon[creativity]
  }

  if (additionalPrompt) {
    prompt += ` Additional request: ${additionalPrompt}`
  }

  if (options.faceMosaic) {
    prompt += ' Apply heavy pixelation mosaic over the entire face (eyes, nose, mouth, cheeks) so the person is completely unrecognizable. Use large, dense mosaic blocks.'
  }

  return prompt
}

// POST: AI 헤어스타일 미리보기 요청 (동기)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      logger.error('[Hairstyle] GEMINI_API_KEY 환경변수 미설정')
      return NextResponse.json(
        { success: false, error: '서비스 설정 오류입니다. 관리자에게 문의해주세요.' },
        { status: 500 }
      )
    }

    // FormData 파싱
    const formData = await request.formData()
    const faceImageFile = formData.get('face_image') as File | null
    const hairstyleImageFile = formData.get('hairstyle_image') as File | null
    const textPrompt = formData.get('prompt') as string | null
    const additionalPrompt = formData.get('additional_prompt') as string | null
    const optionsStr = formData.get('options') as string | null

    // 검증
    if (!faceImageFile || !(faceImageFile instanceof File)) {
      return NextResponse.json(
        { success: false, error: '얼굴 사진을 업로드해주세요' },
        { status: 400 }
      )
    }

    if (!hairstyleImageFile && !textPrompt?.trim()) {
      return NextResponse.json(
        { success: false, error: '헤어스타일 이미지 또는 텍스트 설명을 입력해주세요' },
        { status: 400 }
      )
    }

    let options: HairstyleOptions = { faceMosaic: false, creativityLevel: 'balanced' }
    if (optionsStr) {
      try {
        const parseResult = HairstyleOptionsSchema.safeParse(JSON.parse(optionsStr))
        if (parseResult.success) {
          options = parseResult.data
        } else {
          logger.warn('[Hairstyle] options 검증 실패:', parseResult.error.message)
        }
      } catch (err) {
        logger.warn('[Hairstyle] options JSON 파싱 실패:', err)
      }
    }

    // 이미지 버퍼 읽기 + 검증 (업로드 전에 모두 검증)
    const dateFolder = format(new Date(), 'yyyy/MM/dd')

    const faceBuffer = Buffer.from(await faceImageFile.arrayBuffer())
    if (!validateImageBuffer(faceBuffer, faceImageFile.type)) {
      return NextResponse.json(
        { success: false, error: '얼굴 이미지 파일이 올바르지 않습니다' },
        { status: 400 }
      )
    }

    let hsBuffer: Buffer | null = null
    if (hairstyleImageFile && hairstyleImageFile instanceof File) {
      hsBuffer = Buffer.from(await hairstyleImageFile.arrayBuffer())
      if (!validateImageBuffer(hsBuffer, hairstyleImageFile.type)) {
        return NextResponse.json(
          { success: false, error: '헤어스타일 이미지 파일이 올바르지 않습니다' },
          { status: 400 }
        )
      }
    }

    // 이미지 처리 + S3 업로드 (병렬)
    const [faceResult, hairstyleResult] = await Promise.all([
      uploadToS3(faceBuffer, dateFolder, 'face'),
      hsBuffer ? uploadToS3(hsBuffer, dateFolder, 'style') : Promise.resolve(null),
    ])

    // 크레딧 선결제
    const settings = await getCreditSettings()
    const preChargeAmount = settings.aiHairstylePreChargeAmount

    let preChargeResult: Awaited<ReturnType<typeof deductCredits>>
    try {
      preChargeResult = await deductCredits(
        auth.userId,
        preChargeAmount,
        'debit',
        `AI 헤어스타일 미리보기 선결제 (${preChargeAmount.toLocaleString()})`,
        undefined,
        'ai_hairstyle_request'
      )
    } catch (err: unknown) {
      if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'INSUFFICIENT_CREDIT') {
        return NextResponse.json(
          { success: false, error: '크레딧이 부족합니다. 충전 후 다시 시도해주세요.', code: 'INSUFFICIENT_CREDIT' },
          { status: 402 }
        )
      }
      throw err
    }

    const now = Timestamp.now()
    const db = getDb()

    // Firestore 문서 생성 (pending)
    const docData: Record<string, unknown> = {
      userId: auth.userId,
      userEmail: auth.email,
      faceImageUrl: faceResult.url,
      ...(hairstyleResult && { hairstyleImageUrl: hairstyleResult.url }),
      ...(textPrompt?.trim() && { prompt: textPrompt.trim() }),
      ...(additionalPrompt?.trim() && { additionalPrompt: additionalPrompt.trim() }),
      options,
      status: 'pending',
      preCharge: {
        totalAmount: preChargeAmount,
        sCreditCharged: preChargeResult.sCreditUsed,
        eCreditCharged: preChargeResult.eCreditUsed,
        transactionId: preChargeResult.transactionId,
      },
      createdAt: now,
    }

    const docRef = await db.collection(COLLECTION_NAME).add(docData)

    // 선결제 트랜잭션에 referenceId 업데이트
    await db.collection('credit_transactions').doc(preChargeResult.transactionId).update({
      referenceId: docRef.id,
    })

    // Gemini API 호출 (동기)
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey })

      const geminiPrompt = buildGeminiPrompt(
        !!hairstyleResult,
        textPrompt?.trim() || null,
        additionalPrompt?.trim() || null,
        options
      )

      // 원본 얼굴 이미지의 aspect ratio 감지 → 출력 비율 고정
      const faceAspectRatio = detectAspectRatio(faceResult.width, faceResult.height)

      // contents 구성: [프롬프트텍스트, 얼굴이미지(base), (헤어스타일이미지)]
      const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [
        geminiPrompt,
        {
          inlineData: {
            data: faceResult.buffer.toString('base64'),
            mimeType: 'image/webp',
          },
        },
      ]

      if (hairstyleResult) {
        contents.push({
          inlineData: {
            data: hairstyleResult.buffer.toString('base64'),
            mimeType: 'image/webp',
          },
        })
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: {
            aspectRatio: faceAspectRatio,
            imageSize: '1K',
          },
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      })

      // 결과 이미지 추출 → S3 업로드 (병렬)
      const imageParts = response.candidates?.[0]?.content?.parts?.filter(p => p.inlineData?.data) ?? []

      const resultImageUrls = await Promise.all(
        imageParts.map(async (part) => {
          const imgBuffer = Buffer.from(part.inlineData!.data!, 'base64')
          const { url } = await uploadToS3(imgBuffer, dateFolder, 'result', { resize: false })
          return url
        })
      )

      if (resultImageUrls.length === 0) {
        throw new Error('AI가 이미지를 생성하지 못했습니다. 다른 사진이나 설명으로 다시 시도해주세요.')
      }

      // Firestore 업데이트: success
      await docRef.update({
        status: 'success',
        resultImageUrls,
        completedAt: Timestamp.now(),
      })

      // 정산
      await settleAIRequest(docRef.id, preChargeAmount, 'success', COLLECTION_NAME, 'ai_hairstyle_request', 'AI 헤어스타일')

      return NextResponse.json({
        success: true,
        requestId: docRef.id,
        faceImageUrl: faceResult.url,
        resultImageUrls,
      })
    } catch (error) {
      logger.error('[Hairstyle] Gemini API 에러:', error)

      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다'

      // Firestore 업데이트: failed
      await docRef.update({
        status: 'failed',
        errorMessage,
        completedAt: Timestamp.now(),
      })

      // 전액 환불
      try {
        await settleAIRequest(docRef.id, 0, 'failed', COLLECTION_NAME, 'ai_hairstyle_request', 'AI 헤어스타일')
      } catch (settleErr) {
        logger.error('[Hairstyle] 정산(환급) 실패:', settleErr)
      }

      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: 요청 숨김 (dismissed)
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
    const requestRef = db.collection(COLLECTION_NAME).doc(id)
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

// DELETE: 요청 삭제
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
    const requestRef = db.collection(COLLECTION_NAME).doc(requestId)
    const requestDoc = await requestRef.get()
    requireResource(requestDoc.exists, '요청을 찾을 수 없습니다')

    const requestData = requestDoc.data()
    requirePermission(auth.userId === requestData?.userId, '권한이 없습니다')

    // 미정산 선결제가 있으면 환불 처리
    if (requestData?.preCharge && !requestData?.settlement?.settled) {
      try {
        await settleAIRequest(requestId, 0, 'failed', COLLECTION_NAME, 'ai_hairstyle_request', 'AI 헤어스타일')
      } catch (err) {
        logger.error('[Hairstyle DELETE] 환불 실패:', err)
      }
    }

    await requestRef.delete()

    return NextResponse.json({
      success: true,
      message: '요청이 삭제되었습니다',
    })
  } catch (error) {
    return handleApiError(error)
  }
}

// GET: 요청 이력 조회
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const lastId = searchParams.get('lastId')

    const db = getDb()
    const requestsRef = db.collection(COLLECTION_NAME)
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
