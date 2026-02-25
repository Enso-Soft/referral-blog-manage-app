import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { getCreditSettings } from '@/lib/credit-operations'

// POST: 출석 체크 (1일 1회, S'Credit 상한 적용)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const settings = await getCreditSettings()
    const db = getDb()
    const userRef = db.collection('users').doc(auth.userId)
    const txnRef = db.collection('credit_transactions').doc()

    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef)
      if (!userDoc.exists) {
        throw new Error('사용자를 찾을 수 없습니다')
      }

      const userData = userDoc.data()!
      const sCredit = userData.sCredit ?? 0
      const eCredit = userData.eCredit ?? 0

      // 1일 1회 체크 (서버 시간 기준)
      const now = new Date()
      const lastCheckIn = userData.lastCheckIn?.toDate?.() as Date | undefined
      if (lastCheckIn) {
        const lastDate = new Date(lastCheckIn)
        if (
          lastDate.getFullYear() === now.getFullYear() &&
          lastDate.getMonth() === now.getMonth() &&
          lastDate.getDate() === now.getDate()
        ) {
          throw Object.assign(new Error('오늘은 이미 출석 체크를 완료했습니다'), {
            statusCode: 409,
          })
        }
      }

      // S'Credit 상한 체크
      if (sCredit >= settings.checkinMaxCap) {
        throw Object.assign(
          new Error(`S'Credit이 상한(${settings.checkinMaxCap.toLocaleString()})에 도달했습니다`),
          { statusCode: 409 }
        )
      }

      // 상한 초과하지 않도록 지급량 조정
      const grantAmount = Math.min(
        settings.checkinGrantAmount,
        settings.checkinMaxCap - sCredit
      )
      const newSCredit = sCredit + grantAmount
      const timestamp = Timestamp.now()

      transaction.update(userRef, {
        sCredit: newSCredit,
        lastCheckIn: timestamp,
      })

      transaction.set(txnRef, {
        userId: auth.userId,
        type: 'credit',
        sCreditDelta: grantAmount,
        eCreditDelta: 0,
        sCreditAfter: newSCredit,
        eCreditAfter: eCredit,
        description: `출석 체크 ${grantAmount.toLocaleString()} S'Credit 지급`,
        createdAt: timestamp,
      })

      return { grantAmount, sCredit: newSCredit, eCredit }
    })

    return NextResponse.json({
      success: true,
      data: {
        grantAmount: result.grantAmount,
        sCredit: result.sCredit,
        eCredit: result.eCredit,
        totalCredit: result.sCredit + result.eCredit,
      },
      message: `${result.grantAmount.toLocaleString()} S'Credit 지급 완료!`,
    })
  } catch (error: any) {
    if (error.statusCode === 409) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 409 }
      )
    }
    return handleApiError(error)
  }
}
