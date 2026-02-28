import { NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'

// GET: 전체 크레딧 트랜잭션 조회 (관리자)
export const GET = createApiHandler({ auth: 'bearer', admin: true }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
  const lastId = searchParams.get('lastId')
  const userId = searchParams.get('userId')
  const type = searchParams.get('type')

  const db = getDb()
  let query: FirebaseFirestore.Query = db
    .collection('credit_transactions')
    .orderBy('createdAt', 'desc')

  if (userId) {
    query = query.where('userId', '==', userId)
  }
  if (type) {
    query = query.where('type', '==', type)
  }

  if (lastId) {
    const lastDoc = await db.collection('credit_transactions').doc(lastId).get()
    if (lastDoc.exists) {
      query = query.startAfter(lastDoc)
    }
  }

  const snapshot = await query.limit(limit).get()

  const transactions = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      userId: data.userId,
      type: data.type,
      sCreditDelta: data.sCreditDelta,
      eCreditDelta: data.eCreditDelta,
      sCreditAfter: data.sCreditAfter,
      eCreditAfter: data.eCreditAfter,
      description: data.description,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      adminUserId: data.adminUserId || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    }
  })

  return NextResponse.json({
    success: true,
    data: transactions,
    pagination: {
      limit,
      count: transactions.length,
      lastId: snapshot.docs[snapshot.docs.length - 1]?.id || null,
      hasMore: snapshot.docs.length === limit,
    },
  })
})
