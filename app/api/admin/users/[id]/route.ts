import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromRequest(request)
    if (!auth || !auth.isAdmin) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다' },
        { status: 403 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { role, status } = body

    // 유효성 검사
    if (role && !['admin', 'user'].includes(role)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 역할입니다' },
        { status: 400 }
      )
    }

    if (status && !['active', 'blocked'].includes(status)) {
      return NextResponse.json(
        { success: false, error: '유효하지 않은 상태입니다' },
        { status: 400 }
      )
    }

    // 자기 자신의 역할/상태 변경 방지
    if (id === auth.userId) {
      return NextResponse.json(
        { success: false, error: '자신의 역할이나 상태는 변경할 수 없습니다' },
        { status: 400 }
      )
    }

    const db = getDb()
    const userRef = db.collection('users').doc(id)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    const updateData: Record<string, string> = {}
    if (role) updateData.role = role
    if (status) updateData.status = status

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: '업데이트할 데이터가 없습니다' },
        { status: 400 }
      )
    }

    await userRef.update(updateData)

    return NextResponse.json({
      success: true,
      message: '사용자 정보가 업데이트되었습니다',
    })
  } catch (error) {
    console.error('PATCH user error:', error)
    return NextResponse.json(
      { success: false, error: '사용자 수정에 실패했습니다' },
      { status: 500 }
    )
  }
}
