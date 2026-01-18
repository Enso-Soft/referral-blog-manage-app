import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'

// GET: 단일 포스트 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 조회 가능
    if (!auth.isAdmin && postData?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 포스트에 대한 접근 권한이 없습니다' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      post: { id: doc.id, ...postData },
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
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 수정 가능
    if (!auth.isAdmin && postData?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 포스트를 수정할 권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()

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

    if (body.products !== undefined) {
      updateData.products = body.products
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
    // 인증 확인
    const auth = await getAuthFromRequest(request)
    if (!auth) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    const db = getDb()
    const docRef = db.collection('blog_posts').doc(params.id)
    const doc = await docRef.get()

    if (!doc.exists) {
      return NextResponse.json(
        { success: false, error: '포스트를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const postData = doc.data()

    // 본인 포스트이거나 Admin인 경우만 삭제 가능
    if (!auth.isAdmin && postData?.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 포스트를 삭제할 권한이 없습니다' },
        { status: 403 }
      )
    }

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
