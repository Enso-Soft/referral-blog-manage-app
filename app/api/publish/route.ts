import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'

interface UserData {
  uid: string
  email: string
  displayName?: string
  role: string
  apiKey: string
}

// API 키로 유저 찾기
async function getUserByApiKey(apiKey: string): Promise<UserData | null> {
  const db = getDb()
  const snapshot = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get()

  if (snapshot.empty) {
    return null
  }

  const doc = snapshot.docs[0]
  const data = doc.data()
  return {
    uid: doc.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role,
    apiKey: data.apiKey,
  }
}

// POST: 외부에서 블로그 글 등록
export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    const apiKey = request.headers.get('X-API-Key')
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 필요합니다. X-API-Key 헤더를 확인하세요.' },
        { status: 401 }
      )
    }

    // API 키로 유저 찾기
    const user = await getUserByApiKey(apiKey)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 API 키입니다.' },
        { status: 401 }
      )
    }

    // 요청 바디 파싱
    const body = await request.json()

    // 필수 필드 검증
    if (!body.title) {
      return NextResponse.json(
        { success: false, error: 'title 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    if (!body.content) {
      return NextResponse.json(
        { success: false, error: 'content 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()
    const now = Timestamp.now()

    // products 검증
    const products = Array.isArray(body.products)
      ? body.products.filter((p: any) => p.name && p.affiliateLink)
      : []

    // 블로그 포스트 생성
    const docData = {
      userId: user.uid,
      userEmail: user.email,
      title: body.title,
      content: body.content,
      keywords: Array.isArray(body.keywords) ? body.keywords : [],
      products,
      status: body.status === 'published' ? 'published' : 'draft',
      createdAt: now,
      updatedAt: now,
      metadata: {
        wordCount: body.content.replace(/<[^>]*>/g, '').length,
        source: 'api',
        ...(body.metadata || {}),
      },
    }

    const docRef = await db.collection('blog_posts').add(docData)

    return NextResponse.json({
      success: true,
      id: docRef.id,
      message: '블로그 글이 등록되었습니다.',
    })
  } catch (error) {
    console.error('Publish API error:', error)
    return NextResponse.json(
      { success: false, error: '블로그 글 등록에 실패했습니다.' },
      { status: 500 }
    )
  }
}
