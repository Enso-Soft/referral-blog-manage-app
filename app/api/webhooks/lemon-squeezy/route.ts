import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { grantCredits } from '@/lib/credit-operations'
import { verifyWebhookSignature } from '@/lib/lemon-squeezy'

// POST: Lemon Squeezy 웹훅 (결제 확인 → E'Credit 충전)
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('x-signature') || ''

    // HMAC-SHA256 시그니처 검증
    if (!verifyWebhookSignature(rawBody, signature)) {
      logger.warn('[Webhook] Lemon Squeezy 시그니처 검증 실패')
      return NextResponse.json(
        { success: false, error: '시그니처 검증 실패' },
        { status: 401 }
      )
    }

    const payload = JSON.parse(rawBody)
    const eventName = payload.meta?.event_name
    const eventId = payload.meta?.custom_data?.event_id || payload.data?.id

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: '이벤트 ID가 없습니다' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 멱등성: 이미 처리된 이벤트인지 확인
    const eventRef = db.collection('lemon_squeezy_events').doc(String(eventId))
    const eventDoc = await eventRef.get()
    if (eventDoc.exists) {
      return NextResponse.json({ success: true, message: '이미 처리된 이벤트입니다' })
    }

    // order_created 이벤트만 처리
    if (eventName !== 'order_created') {
      // 이벤트 기록만 하고 스킵
      await eventRef.set({
        eventName,
        payload: payload.data,
        processedAt: Timestamp.now(),
        skipped: true,
      })
      return NextResponse.json({ success: true, message: `${eventName} 이벤트 무시` })
    }

    const customData = payload.meta?.custom_data || {}
    const userId = customData.user_id
    const creditAmount = Number(customData.credit_amount) || 0

    if (!userId || creditAmount <= 0) {
      logger.error('[Webhook] userId 또는 creditAmount 누락', { userId, creditAmount })
      await eventRef.set({
        eventName,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: 'userId 또는 creditAmount 누락',
      })
      return NextResponse.json(
        { success: false, error: '필수 데이터 누락' },
        { status: 400 }
      )
    }

    // 유저 존재 여부 사전 검증 (불필요한 트랜잭션 시작 방지)
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      logger.error('[Webhook] 존재하지 않는 userId', { userId })
      await eventRef.set({
        eventName,
        userId,
        creditAmount,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: '존재하지 않는 사용자',
      })
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 400 }
      )
    }

    // E'Credit 충전
    const result = await grantCredits(
      userId,
      0,
      creditAmount,
      'credit',
      `${creditAmount.toLocaleString()} E'Credit 충전`,
      String(eventId),
      'lemon_squeezy_order'
    )

    // 이벤트 기록
    await eventRef.set({
      eventName,
      userId,
      creditAmount,
      transactionId: result.transactionId,
      payload: payload.data,
      processedAt: Timestamp.now(),
    })

    logger.info(`[Webhook] E'Credit ${creditAmount} 충전 완료 (userId: ${userId})`)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Webhook] Lemon Squeezy 처리 에러:', error)
    return NextResponse.json(
      { success: false, error: '웹훅 처리 실패' },
      { status: 500 }
    )
  }
}
