import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'

// GET: 포스트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const db = getDb()
    let query = db.collection('blog_posts').orderBy('createdAt', 'desc')

    if (status && (status === 'draft' || status === 'published')) {
      query = query.where('status', '==', status)
    }

    const snapshot = await query.get()
    const posts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))

    return NextResponse.json({ success: true, posts })
  } catch (error) {
    console.error('GET posts error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 목록 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// POST: 새 포스트 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const db = getDb()

    const now = Timestamp.now()
    const docData = {
      title: body.title || '제목 없음',
      content: body.content || '',
      excerpt: body.excerpt || '',
      thumbnail: body.thumbnail || '',
      keywords: body.keywords || [],
      status: body.status || 'draft',
      platform: body.platform || 'both',
      createdAt: now,
      updatedAt: now,
      metadata: body.metadata || { wordCount: 0 },
    }

    const docRef = await db.collection('blog_posts').add(docData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
    })
  } catch (error) {
    console.error('POST post error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 생성에 실패했습니다' },
      { status: 500 }
    )
  }
}
