import * as admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { downloadFromUrl } from './lib/s3'
import { handleProcessingFailure, PreCharge } from './lib/error-handler'

const AI_API_URL = 'https://api.enso-soft.xyz/v1/ai/blog-writer'

interface AIWriteRequestData {
  userId: string
  userEmail: string
  prompt: string
  images: string[]          // S3 URLs
  options: Record<string, unknown>
  status: string
  preCharge?: PreCharge
}

export const processAIWrite = onDocumentCreated(
  {
    document: 'ai_write_requests/{requestId}',
    region: 'asia-northeast3',
    timeoutSeconds: 60,
    memory: '512MiB',
    maxInstances: 10,
  },
  async (event) => {
    const requestId = event.params.requestId
    const snapshot = event.data
    if (!snapshot) {
      console.error(`[AIWrite] 문서 스냅샷 없음: ${requestId}`)
      return
    }

    const data = snapshot.data() as AIWriteRequestData
    const db = admin.firestore()
    const docRef = db.collection('ai_write_requests').doc(requestId)

    // 멱등성: pending이 아니면 스킵
    if (data.status !== 'pending') {
      console.log(`[AIWrite] 이미 처리된 요청: ${requestId} (status: ${data.status})`)
      return
    }

    try {
      // 1. 사용자 API 키 조회 + S3 이미지 → base64 변환 (병렬)
      const [userDoc, imageBase64s] = await Promise.all([
        db.collection('users').doc(data.userId).get(),
        Promise.all(
          data.images.map(async (url) => {
            const buffer = await downloadFromUrl(url)
            return `data:image/webp;base64,${buffer.toString('base64')}`
          })
        ),
      ])

      if (!userDoc.exists) {
        throw new Error('사용자를 찾을 수 없습니다')
      }
      const apiKey = userDoc.data()?.apiKey as string | undefined
      if (!apiKey) {
        throw new Error('API 키가 발급되지 않았습니다. 설정 페이지에서 API 키를 발급해주세요.')
      }

      // 2. 외부 AI API 호출
      const response = await fetch(AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          requestId,
          userId: data.userId,
          prompt: data.prompt,
          images: imageBase64s,
          options: data.options,
        }),
      })

      const responseBody = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(responseBody.detail || `AI API 오류: ${response.status}`)
      }

      if (!responseBody.success) {
        throw new Error(responseBody.detail || 'AI API 응답이 올바르지 않습니다')
      }

      // 성공: 외부 API가 Firestore 직접 업데이트하므로 추가 작업 불필요
      console.log(`[AIWrite] 외부 API 호출 성공: ${requestId}`)
    } catch (error) {
      await handleProcessingFailure(
        requestId, docRef, error,
        'AIWrite', 'ai_write_requests', 'ai_write_request', 'AI 글 작성'
      )
    }
  }
)
