import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'

// GET: 단일 포스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      post: { id: doc.id, ...doc.data() },
    })
  } catch (error) {
    console.error('GET post error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 조회에 실패했습니다' },
      { status: 500 }
    )
  }
}

// PATCH: 포스트 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)

    // 업데이트 데이터 준비
    const updateData: Record<string, any> = {
      updatedAt: Timestamp.now(),
    }

    if (body.content !== undefined) {
      updateData.content = body.content
    }

    if (body.title !== undefined) {
      updateData.title = body.title
    }

    if (body.status !== undefined) {
      updateData.status = body.status
    }

    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata
    }

    await docRef.update(updateData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('PATCH post error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 저장에 실패했습니다' },
      { status: 500 }
    )
  }
}

// DELETE: 포스트 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)
    await docRef.delete()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE post error:', error)
    return NextResponse.json(
      { success: false, error: '포스트 삭제에 실패했습니다' },
      { status: 500 }
    )
  }
}
