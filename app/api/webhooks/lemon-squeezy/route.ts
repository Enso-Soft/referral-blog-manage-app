import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { grantCredits, adminDeductCredits, getCreditSettings } from '@/lib/credit-operations'
import { verifyWebhookSignature, verifyOrder } from '@/lib/lemon-squeezy'

// POST: Lemon Squeezy 웹훅 (결제 확인 → E'Credit 충전)
export async function POST(request: NextRequest) {
  // 이번 요청에서 이벤트 문서를 선점했는지 추적 (예기치 못한 예외 시 클레임 해제용)
  let claimedEventRef: FirebaseFirestore.DocumentReference | null = null
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

    // 멱등성: 트랜잭션으로 이벤트를 원자적으로 선점 (동시 중복 전달 시 이중 충전/차감 방지)
    const eventRef = db.collection('lemon_squeezy_events').doc(String(eventId))
    const claimed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(eventRef)
      if (snap.exists) return false
      tx.set(eventRef, { eventName, status: 'processing', claimedAt: Timestamp.now() })
      return true
    })
    if (!claimed) {
      return NextResponse.json({ success: true, message: '이미 처리된 이벤트입니다' })
    }
    // 이후 처리 중 예기치 못한 예외가 나면 클레임을 지워 웹훅 재시도가 가능하도록 한다.
    // (검증 실패로 인한 명시적 error 응답 경로는 eventRef.set(...)으로 덮어써 재시도를 막는다.)
    claimedEventRef = eventRef

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

    // 환불 시 custom_data 없으면 원래 주문 기록에서 userId 조회 (대시보드 수동 환불 대응)
    if (!userId && eventName === 'order_refunded') {
      const originalEventRef = db.collection('lemon_squeezy_events').doc(`order_created_${rawEventId}`)
      const originalEvent = await originalEventRef.get()
      if (originalEvent.exists) {
        const originalData = originalEvent.data()!
        userId = originalData.userId
      }
    }

    if (!userId) {
      logger.error('[Webhook] userId 누락', { userId })
      await eventRef.set({
        eventName,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: 'userId 누락',
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
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: '이미 환불된 주문',
      })
      return NextResponse.json(
        { success: false, error: '이미 환불된 주문' },
        { status: 400 }
      )
    }

    // 서버에서 크레딧 계산: subtotal(센트 단위, 세전) → 원 변환 → × creditPerWon
    // Lemon Squeezy는 모든 통화를 센트 단위로 반환 (₩2,500 → 250000)
    const subtotalCents = order.subtotal || order.total || 0
    const orderTotal = Math.round(subtotalCents / 100)
    const creditSettings = await getCreditSettings()
    const creditAmount = orderTotal * creditSettings.creditPerWon

    logger.info('[Webhook] 크레딧 계산', {
      rawSubtotal: order.subtotal,
      rawTotal: order.total,
      rawTax: order.tax,
      orderTotal,
      creditPerWon: creditSettings.creditPerWon,
      creditAmount,
    })

    if (creditAmount <= 0) {
      logger.error('[Webhook] 크레딧 계산 결과 0 이하', { orderTotal, creditPerWon: creditSettings.creditPerWon })
      await eventRef.set({
        eventName,
        userId,
        orderTotal,
        creditPerWon: creditSettings.creditPerWon,
        creditAmount,
        payload: payload.data,
        processedAt: Timestamp.now(),
        error: '크레딧 계산 결과 0 이하',
      })
      return NextResponse.json(
        { success: false, error: '유효하지 않은 결제 금액' },
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
        orderTotal,
        creditPerWon: creditSettings.creditPerWon,
        creditAmount,
        transactionId: result.transactionId,
        payload: payload.data,
        processedAt: Timestamp.now(),
      })

      logger.info(`[Webhook] E'Credit ${creditAmount} 충전 완료 (userId: ${userId})`)
    } else if (eventName === 'order_refunded') {
      // 환불: 원래 충전(order_created) 시 실제 지급된 E'Credit 만큼 차감한다.
      // 현재 creditPerWon 설정으로 재계산하면 그 사이 설정이 바뀐 경우 과소/과대 차감이 발생하므로,
      // 원 이벤트에 기록된 creditAmount를 우선 사용하고, 없을 때만(레거시) 재계산 값으로 폴백한다.
      const originalCreatedEvent = await db
        .collection('lemon_squeezy_events')
        .doc(`order_created_${rawEventId}`)
        .get()
      const grantedAmount =
        originalCreatedEvent.exists && typeof originalCreatedEvent.data()?.creditAmount === 'number'
          ? (originalCreatedEvent.data()!.creditAmount as number)
          : creditAmount

      const userData = userDoc.data()!
      const eCredit = userData.eCredit ?? 0
      const deductAmount = Math.min(grantedAmount, eCredit)

      if (deductAmount > 0) {
        // adminDeductCredits로 E'Credit만 정확히 차감 (S'Credit 보호)
        const result = await adminDeductCredits(
          userId,
          0,
          deductAmount,
          `${grantedAmount.toLocaleString()} E'Credit 환불 차감`,
          'system_webhook'
        )

        await eventRef.set({
          eventName,
          userId,
          orderTotal,
          creditPerWon: creditSettings.creditPerWon,
          creditAmount: grantedAmount,
          deductedAmount: deductAmount,
          shortfall: grantedAmount - deductAmount,
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
          orderTotal,
          creditPerWon: creditSettings.creditPerWon,
          creditAmount: grantedAmount,
          deductedAmount: 0,
          shortfall: grantedAmount,
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
    // 예기치 못한 예외(예: verifyOrder 네트워크 오류)로 미처리 상태면 클레임을 해제해 재시도를 허용한다.
    if (claimedEventRef) {
      await claimedEventRef.delete().catch(() => {})
    }
    return NextResponse.json(
      { success: false, error: '웹훅 처리 실패' },
      { status: 500 }
    )
  }
}
