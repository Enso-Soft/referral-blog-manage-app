import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'

// GET: 크레딧 트랜잭션 이력 (커서 기반 페이지네이션)
export const GET = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
  const lastId = searchParams.get('lastId')
  const type = searchParams.get('type')

  const db = getDb()
  let query: FirebaseFirestore.Query = db
    .collection('credit_transactions')
    .where('userId', '==', auth.userId)
    .orderBy('createdAt', 'desc')

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
      type: data.type,
      sCreditDelta: data.sCreditDelta,
      eCreditDelta: data.eCreditDelta,
      sCreditAfter: data.sCreditAfter,
      eCreditAfter: data.eCreditAfter,
      description: data.description,
      referenceId: data.referenceId || null,
      referenceType: data.referenceType || null,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
    }
  })

  const lastDoc = snapshot.docs[snapshot.docs.length - 1]

  return NextResponse.json({
    success: true,
    data: transactions,
    pagination: {
      limit,
      count: transactions.length,
      lastId: lastDoc?.id || null,
      hasMore: snapshot.docs.length === limit,
    },
  })
})
