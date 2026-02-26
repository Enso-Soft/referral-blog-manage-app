import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { grantCredits, adminDeductCredits } from '@/lib/credit-operations'
import { verifyWebhookSignature, verifyOrder } from '@/lib/lemon-squeezy'

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
    // 이벤트 타입별로 고유 키 생성 (order_created와 order_refunded가 같은 orderId를 공유하므로)
    const rawEventId = payload.meta?.custom_data?.event_id || payload.data?.id
    const eventId = rawEventId ? `${eventName}_${rawEventId}` : null

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

    // order_created / order_refunded 이벤트만 처리
    if (eventName !== 'order_created' && eventName !== 'order_refunded') {
      await eventRef.set({
        eventName,
        payload: payload.data,
        processedAt: Timestamp.now(),
        skipped: true,
      })
      return NextResponse.json({ success: true, message: `${eventName} 이벤트 무시` })
    }

    const customData = payload.meta?.custom_data || {}
    let userId = customData.user_id
    let creditAmount = Number(customData.credit_amount) || 0

    // 환불 시 custom_data 없으면 원래 주문 기록에서 조회 (대시보드 수동 환불 대응)
    if ((!userId || creditAmount <= 0) && eventName === 'order_refunded') {
      const originalEventRef = db.collection('lemon_squeezy_events').doc(`order_created_${rawEventId}`)
      const originalEvent = await originalEventRef.get()
      if (originalEvent.exists) {
        const originalData = originalEvent.data()!
        userId = userId || originalData.userId
        creditAmount = creditAmount || originalData.creditAmount
      }
    }

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

    // Lemon Squeezy API로 주문 검증 (실존 + store_id + 상태 크로스체크)
    const rawOrderId = payload.data?.id
    const order = await verifyOrder(String(rawOrderId || ''))
    if (!rawOrderId || !order.valid) {
      logger.warn('[Webhook] 주문 검증 실패 - Lemon Squeezy에 존재하지 않는 주문', { orderId: rawOrderId })
      await eventRef.set({
        eventName,
        userId,
        creditAmount,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: '주문 검증 실패',
      })
      return NextResponse.json(
        { success: false, error: '주문 검증 실패' },
        { status: 403 }
      )
    }

    // 상태 크로스체크: 충전 요청인데 이미 환불된 주문이면 차단
    if (eventName === 'order_created' && order.refunded) {
      logger.warn('[Webhook] 이미 환불된 주문에 대한 충전 요청 차단', { orderId: rawOrderId })
      await eventRef.set({
        eventName,
        userId,
        creditAmount,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: '이미 환불된 주문',
      })
      return NextResponse.json(
        { success: false, error: '이미 환불된 주문' },
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

    if (eventName === 'order_created') {
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

      await eventRef.set({
        eventName,
        userId,
        creditAmount,
        transactionId: result.transactionId,
        payload: payload.data,
        processedAt: Timestamp.now(),
      })

      logger.info(`[Webhook] E'Credit ${creditAmount} 충전 완료 (userId: ${userId})`)
    } else if (eventName === 'order_refunded') {
      // 환불: E'Credit 차감 (잔액 부족 시 가능한 만큼만)
      const userData = userDoc.data()!
      const eCredit = userData.eCredit ?? 0
      const deductAmount = Math.min(creditAmount, eCredit)

      if (deductAmount > 0) {
        // adminDeductCredits로 E'Credit만 정확히 차감 (S'Credit 보호)
        const result = await adminDeductCredits(
          userId,
          0,
          deductAmount,
          `${creditAmount.toLocaleString()} E'Credit 환불 차감`,
          'system_webhook'
        )

        await eventRef.set({
          eventName,
          userId,
          creditAmount,
          deductedAmount: deductAmount,
          shortfall: creditAmount - deductAmount,
          transactionId: result.transactionId,
          payload: payload.data,
          processedAt: Timestamp.now(),
        })

        logger.info(`[Webhook] E'Credit ${deductAmount} 환불 차감 완료 (userId: ${userId})`)
      } else {
        // 잔액 0: 차감 불가, 기록만
        await eventRef.set({
          eventName,
          userId,
          creditAmount,
          deductedAmount: 0,
          shortfall: creditAmount,
          payload: payload.data,
          processedAt: Timestamp.now(),
          error: '잔액 부족으로 차감 불가',
        })

        logger.warn(`[Webhook] 환불 차감 실패 - 잔액 부족 (userId: ${userId}, 요청: ${creditAmount}, 잔액: 0)`)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('[Webhook] Lemon Squeezy 처리 에러:', error)
    return NextResponse.json(
      { success: false, error: '웹훅 처리 실패' },
      { status: 500 }
    )
  }
}
