import * as admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { defineSecret } from 'firebase-functions/params'
import { GoogleGenAI, ThinkingLevel } from '@google/genai'
import { format } from 'date-fns'
import { detectAspectRatio, buildGeminiPrompt } from './lib/gemini'
import { uploadToS3, downloadFromUrl } from './lib/s3'
import { settleAIRequest } from './lib/credit'

// Secret 정의
const geminiApiKey = defineSecret('GEMINI_API_KEY')
const s3AccessKeyId = defineSecret('S3_ACCESS_KEY_ID')
const s3SecretAccessKey = defineSecret('S3_SECRET_ACCESS_KEY')
const s3Region = defineSecret('S3_REGION')
const s3Bucket = defineSecret('S3_BUCKET')

interface HairstyleRequestData {
  userId: string
  userEmail: string
  faceImageUrl: string
  hairstyleImageUrl?: string
  prompt?: string
  additionalPrompt?: string
  options: {
    faceMosaic: boolean
    creativityLevel?: 'strict' | 'balanced' | 'creative'
  }
  status: string
  faceImageWidth?: number
  faceImageHeight?: number
  preCharge?: {
    totalAmount: number
    sCreditCharged: number
    eCreditCharged: number
    transactionId: string
  }
}

export const processHairstyle = onDocumentCreated(
  {
    document: 'ai_hairstyle_requests/{requestId}',
    region: 'asia-northeast3',
    timeoutSeconds: 120,
    memory: '2GiB',
    maxInstances: 10,
    secrets: [geminiApiKey, s3AccessKeyId, s3SecretAccessKey, s3Region, s3Bucket],
  },
  async (event) => {
    const requestId = event.params.requestId
    const snapshot = event.data
    if (!snapshot) {
      console.error(`[Hairstyle] 문서 스냅샷 없음: ${requestId}`)
      return
    }

    const data = snapshot.data() as HairstyleRequestData
    const db = admin.firestore()
    const docRef = db.collection('ai_hairstyle_requests').doc(requestId)

    // 멱등성: pending이 아니면 스킵
    if (data.status !== 'pending') {
      console.log(`[Hairstyle] 이미 처리된 요청: ${requestId} (status: ${data.status})`)
      return
    }

    try {
      // 1. 이미지 다운로드 (병렬)
      const downloadPromises: [Promise<Buffer>, Promise<Buffer | null>] = [
        downloadFromUrl(data.faceImageUrl),
        data.hairstyleImageUrl ? downloadFromUrl(data.hairstyleImageUrl) : Promise.resolve(null),
      ]
      const [faceBuffer, hairstyleBuffer] = await Promise.all(downloadPromises)

      // 2. Aspect ratio 감지
      const faceWidth = data.faceImageWidth ?? 1024
      const faceHeight = data.faceImageHeight ?? 1024
      const faceAspectRatio = detectAspectRatio(faceWidth, faceHeight)

      // 3. Gemini 프롬프트 구성
      const geminiPrompt = buildGeminiPrompt(
        !!hairstyleBuffer,
        data.prompt ?? null,
        data.additionalPrompt ?? null,
        data.options
      )

      // 4. Gemini API 호출
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() })

      const contents: Array<string | { inlineData: { data: string; mimeType: string } }> = [
        geminiPrompt,
        {
          inlineData: {
            data: faceBuffer.toString('base64'),
            mimeType: 'image/webp',
          },
        },
      ]

      if (hairstyleBuffer) {
        contents.push({
          inlineData: {
            data: hairstyleBuffer.toString('base64'),
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

      // 5. 결과 이미지 추출 → S3 업로드
      const imageParts = response.candidates?.[0]?.content?.parts?.filter(
        (p: { inlineData?: { data?: string } }) => p.inlineData?.data
      ) ?? []

      const dateFolder = format(new Date(), 'yyyy/MM/dd')
      const resultImageUrls = await Promise.all(
        imageParts.map(async (part: { inlineData?: { data?: string } }) => {
          const imgBuffer = Buffer.from(part.inlineData!.data!, 'base64')
          const { url } = await uploadToS3(imgBuffer, dateFolder, 'result', { resize: false })
          return url
        })
      )

      if (resultImageUrls.length === 0) {
        throw new Error('AI가 이미지를 생성하지 못했습니다. 다른 사진이나 설명으로 다시 시도해주세요.')
      }

      // 6. Firestore 업데이트: success
      await docRef.update({
        status: 'success',
        resultImageUrls,
        completedAt: admin.firestore.Timestamp.now(),
      })

      // 7. 정산
      const preChargeAmount = data.preCharge?.totalAmount ?? 0
      await settleAIRequest(
        requestId,
        preChargeAmount,
        'success',
        'ai_hairstyle_requests',
        'ai_hairstyle_request',
        'AI 헤어스타일'
      )

      console.log(`[Hairstyle] 성공: ${requestId}, 이미지 ${resultImageUrls.length}개`)
    } catch (error) {
      console.error(`[Hairstyle] 실패: ${requestId}`, error)

      const errorMessage = error instanceof Error
        ? error.message
        : '알 수 없는 오류가 발생했습니다'

      // Firestore 업데이트: failed
      await docRef.update({
        status: 'failed',
        errorMessage,
        completedAt: admin.firestore.Timestamp.now(),
      })

      // 전액 환불
      try {
        await settleAIRequest(
          requestId,
          0,
          'failed',
          'ai_hairstyle_requests',
          'ai_hairstyle_request',
          'AI 헤어스타일'
        )
      } catch (settleErr) {
        console.error(`[Hairstyle] 정산(환급) 실패: ${requestId}`, settleErr)
      }
    }
  }
)
