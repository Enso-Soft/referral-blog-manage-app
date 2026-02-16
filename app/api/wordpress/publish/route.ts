import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import { createWPPost, updateWPPost, deleteWPPost, checkWPPostExists, migrateImagesToWP } from '@/lib/wordpress-api'

// GET: 기존 WP 글 존재 여부 확인 + 싱크
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const db = getDb()
    const sync = request.nextUrl.searchParams.get('sync') === 'true'
    const postId = request.nextUrl.searchParams.get('postId')

    // sync=true: Firestore 기준으로 WP 글 존재 확인 + 없으면 자동 정리
    if (sync && postId) {
      const postDoc = await db.collection('blog_posts').doc(postId).get()
      if (!postDoc.exists) {
        return NextResponse.json({ success: true, data: { synced: false, exists: false } })
      }

      const postData = postDoc.data()!
      if (postData.userId !== auth.userId) {
        return NextResponse.json({ success: false, error: '권한이 없습니다.' }, { status: 403 })
      }

      const wpPostId = postData.wordpress?.wpPostId
      if (!wpPostId) {
        return NextResponse.json({ success: true, data: { synced: false, exists: false } })
      }

      const userDoc = await db.collection('users').doc(auth.userId).get()
      const userData = userDoc.data()
      if (!userData?.wpSiteUrl || !userData?.wpUsername || !userData?.wpAppPassword) {
        return NextResponse.json({ success: true, data: { synced: false, exists: false } })
      }

      const conn = {
        siteUrl: userData.wpSiteUrl,
        username: userData.wpUsername,
        appPassword: userData.wpAppPassword,
      }

      const exists = await checkWPPostExists(conn, wpPostId)
      if (exists) {
        return NextResponse.json({ success: true, data: { synced: false, exists: true } })
      }

      // WP에서 삭제됨 → Firestore 정리 (이력 보존)
      const existingHistory = postData.wordpress?.publishHistory || []
      await db.collection('blog_posts').doc(postId).update({
        wordpress: {
          postStatus: 'not_published',
          publishHistory: existingHistory,
        },
        status: 'draft',
        publishedUrl: '',
        updatedAt: Timestamp.now(),
      })

      return NextResponse.json({ success: true, data: { synced: true, exists: false } })
    }

    // 기존 동작: wpPostId로 존재 여부만 확인
    const wpPostId = Number(request.nextUrl.searchParams.get('wpPostId'))
    if (!wpPostId) {
      return NextResponse.json({ success: true, data: { exists: false } })
    }

    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()
    if (!userData?.wpSiteUrl || !userData?.wpUsername || !userData?.wpAppPassword) {
      return NextResponse.json({ success: true, data: { exists: false } })
    }

    const conn = {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: userData.wpAppPassword,
    }

    const exists = await checkWPPostExists(conn, wpPostId)
    return NextResponse.json({ success: true, data: { exists } })
  } catch (error) {
    return handleApiError(error)
  }
}

// POST: WordPress에 발행
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const {
      postId,
      status = 'publish',
      featuredImageUrl,
      removeFeaturedFromContent = false,
      categories,
      tags,
      date,
      slug,
      excerpt,
      commentStatus,
    } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 1. 블로그 글 조회
    const postDoc = await db.collection('blog_posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()!

    // 소유권 확인
    if (postData.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 게시글에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    // 2. 사용자 WP 연결 정보 확인
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.wpSiteUrl || !userData?.wpUsername || !userData?.wpAppPassword) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다. 설정에서 연결해주세요.' },
        { status: 400 }
      )
    }

    const conn = {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: userData.wpAppPassword,
    }

    // 3. WordPress 발행
    try {
      let content = postData.content || ''
      let featuredMediaId: number | undefined

      // 이미지 마이그레이션 (항상 실행)
      const result = await migrateImagesToWP(content, conn, {
        featuredImageUrl,
        removeFeaturedFromContent,
      })
      content = result.content
      featuredMediaId = result.featuredMediaId

      const isScheduled = status === 'future'

      // 글 생성
      const wpPost = await createWPPost({
        conn,
        title: postData.title,
        content,
        status: status as 'draft' | 'publish' | 'future',
        featuredMediaId,
        categories: categories?.length > 0 ? categories : undefined,
        tags: tags?.length > 0 ? tags : undefined,
        date: date || undefined,
        slug: slug || undefined,
        excerpt: excerpt || undefined,
        commentStatus: commentStatus || undefined,
      })

      // 이력 엔트리 생성
      const existingHistory = postData.wordpress?.publishHistory || []
      const historyEntry = {
        action: isScheduled ? 'scheduled' : 'published',
        timestamp: Timestamp.now(),
        wpPostId: wpPost.id,
        wpPostUrl: wpPost.link,
        status,
      }

      // Firestore 업데이트
      const wpUpdate: Record<string, unknown> = {
        'wordpress.wpPostId': wpPost.id,
        'wordpress.wpPostUrl': wpPost.link,
        'wordpress.publishedAt': Timestamp.now(),
        'wordpress.errorMessage': null,
        'wordpress.lastSyncedAt': Timestamp.now(),
        'wordpress.publishHistory': [...existingHistory, historyEntry],
      }

      if (isScheduled) {
        wpUpdate['wordpress.postStatus'] = 'scheduled'
        wpUpdate['wordpress.scheduledAt'] = date ? Timestamp.fromDate(new Date(date)) : Timestamp.now()
      } else {
        wpUpdate['wordpress.postStatus'] = 'published'
        wpUpdate.status = 'published'
        wpUpdate.publishedUrl = wpPost.link
      }

      if (slug) wpUpdate['wordpress.slug'] = slug
      if (excerpt) wpUpdate['wordpress.excerpt'] = excerpt
      if (tags?.length > 0) wpUpdate['wordpress.tags'] = tags
      if (categories?.length > 0) wpUpdate['wordpress.categories'] = categories
      if (commentStatus) wpUpdate['wordpress.commentStatus'] = commentStatus

      wpUpdate.updatedAt = Timestamp.now()

      await db.collection('blog_posts').doc(postId).update(wpUpdate)

      return NextResponse.json({
        success: true,
        data: {
          wpPostId: wpPost.id,
          wpPostUrl: wpPost.link,
          postStatus: isScheduled ? 'scheduled' : 'published',
        },
        message: isScheduled ? 'WordPress에 예약 발행되었습니다.' : 'WordPress에 발행되었습니다.',
      })
    } catch (postError) {
      // 실패: Firestore 업데이트
      const errorMessage = postError instanceof Error ? postError.message : '알 수 없는 오류'
      await db.collection('blog_posts').doc(postId).update({
        'wordpress.postStatus': 'failed',
        'wordpress.errorMessage': errorMessage,
        updatedAt: Timestamp.now(),
      })

      return NextResponse.json(
        { success: false, error: `WordPress 발행 실패: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// PATCH: WordPress 글 수정 (업데이트)
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const {
      postId,
      status = 'publish',
      featuredImageUrl,
      removeFeaturedFromContent = false,
      categories,
      tags,
      slug,
      excerpt,
      commentStatus,
    } = await request.json()

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()

    // 1. 블로그 글 조회
    const postDoc = await db.collection('blog_posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()!

    if (postData.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 게시글에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const wpPostId = postData.wordpress?.wpPostId
    if (!wpPostId) {
      return NextResponse.json(
        { success: false, error: 'WordPress에 발행된 글이 없습니다.' },
        { status: 400 }
      )
    }

    // 2. 사용자 WP 연결 정보 확인
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData?.wpSiteUrl || !userData?.wpUsername || !userData?.wpAppPassword) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const conn = {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: userData.wpAppPassword,
    }

    // 3. WP 글 존재 확인
    const exists = await checkWPPostExists(conn, wpPostId)
    if (!exists) {
      // WP에서 삭제됨 → Firestore 정리 (이력 보존)
      const existingHistory = postData.wordpress?.publishHistory || []
      await db.collection('blog_posts').doc(postId).update({
        wordpress: {
          postStatus: 'not_published',
          publishHistory: existingHistory,
        },
        status: 'draft',
        publishedUrl: '',
        updatedAt: Timestamp.now(),
      })
      return NextResponse.json(
        { success: false, error: 'WordPress 글이 더 이상 존재하지 않습니다. 상태가 초기화되었습니다.' },
        { status: 404 }
      )
    }

    // 4. WordPress 업데이트
    try {
      let content = postData.content || ''
      let featuredMediaId: number | undefined

      const result = await migrateImagesToWP(content, conn, {
        featuredImageUrl,
        removeFeaturedFromContent,
      })
      content = result.content
      featuredMediaId = result.featuredMediaId

      const wpPost = await updateWPPost({
        conn,
        wpPostId,
        title: postData.title,
        content,
        status: status as 'draft' | 'publish' | 'future',
        featuredMediaId,
        categories: categories?.length > 0 ? categories : undefined,
        tags: tags?.length > 0 ? tags : undefined,
        slug: slug || undefined,
        excerpt: excerpt !== undefined ? excerpt : undefined,
        commentStatus: commentStatus || undefined,
      })

      // 이력 엔트리
      const existingHistory = postData.wordpress?.publishHistory || []
      const historyEntry = {
        action: 'updated',
        timestamp: Timestamp.now(),
        wpPostId: wpPost.id,
        wpPostUrl: wpPost.link,
        status,
      }

      const wpUpdate: Record<string, unknown> = {
        'wordpress.wpPostUrl': wpPost.link,
        'wordpress.lastSyncedAt': Timestamp.now(),
        'wordpress.errorMessage': null,
        'wordpress.publishHistory': [...existingHistory, historyEntry],
      }

      if (slug) wpUpdate['wordpress.slug'] = slug
      if (excerpt !== undefined) wpUpdate['wordpress.excerpt'] = excerpt
      if (tags?.length > 0) wpUpdate['wordpress.tags'] = tags
      if (categories?.length > 0) wpUpdate['wordpress.categories'] = categories
      if (commentStatus) wpUpdate['wordpress.commentStatus'] = commentStatus

      wpUpdate.publishedUrl = wpPost.link
      wpUpdate.updatedAt = Timestamp.now()

      await db.collection('blog_posts').doc(postId).update(wpUpdate)

      return NextResponse.json({
        success: true,
        data: {
          wpPostId: wpPost.id,
          wpPostUrl: wpPost.link,
          postStatus: 'published',
        },
        message: 'WordPress 글이 업데이트되었습니다.',
      })
    } catch (updateError) {
      const errorMessage = updateError instanceof Error ? updateError.message : '알 수 없는 오류'
      return NextResponse.json(
        { success: false, error: `WordPress 업데이트 실패: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    return handleApiError(error)
  }
}

// DELETE: WordPress 글 삭제
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromRequest(request)
    requireAuth(auth)

    const { postId } = await request.json()
    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId 필드는 필수입니다.' },
        { status: 400 }
      )
    }

    const db = getDb()

    const postDoc = await db.collection('blog_posts').doc(postId).get()
    if (!postDoc.exists) {
      return NextResponse.json(
        { success: false, error: '게시글을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const postData = postDoc.data()!
    if (postData.userId !== auth.userId) {
      return NextResponse.json(
        { success: false, error: '이 게시글에 대한 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const wpPostId = postData.wordpress?.wpPostId
    if (!wpPostId) {
      return NextResponse.json(
        { success: false, error: 'WordPress에 발행된 글이 없습니다.' },
        { status: 400 }
      )
    }

    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()
    if (!userData?.wpSiteUrl || !userData?.wpUsername || !userData?.wpAppPassword) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const conn = {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: userData.wpAppPassword,
    }

    try {
      await deleteWPPost(conn, wpPostId)
    } catch {
      // WP에서 이미 삭제된 경우(404) 무시 — Firestore 정리는 계속 진행
    }

    // Firestore 정리 (이력 보존)
    const existingHistory = postData.wordpress?.publishHistory || []
    const historyEntry = {
      action: 'deleted',
      timestamp: Timestamp.now(),
      wpPostId,
    }

    await db.collection('blog_posts').doc(postId).update({
      wordpress: {
        postStatus: 'not_published',
        publishHistory: [...existingHistory, historyEntry],
      },
      status: 'draft',
      publishedUrl: '',
      updatedAt: Timestamp.now(),
    })

    return NextResponse.json({
      success: true,
      message: 'WordPress 글이 삭제되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
