import { NextRequest, NextResponse } from 'next/server'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getAuthFromRequest } from '@/lib/auth-admin'
import { handleApiError, requireAuth } from '@/lib/api-error-handler'
import {
  createWPPost, updateWPPost, deleteWPPost, checkWPPostExists,
  migrateImagesToWP,
  normalizeWordPressData, getOverallWPStatus, getPrimaryPublishedUrl,
} from '@/lib/wordpress-api'
import { getDecryptedWPConnection } from '@/lib/api-helpers'
import type { FirestoreUserData } from '@/lib/schemas/user'

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

      const userDoc = await db.collection('users').doc(auth.userId).get()
      const userData = userDoc.data()
      if (!userData) {
        return NextResponse.json({ success: true, data: { synced: false, exists: false } })
      }

      const normalized = normalizeWordPressData(postData.wordpress)
      const publishedSiteEntries = Object.entries(normalized.sites).filter(
        ([, d]) => d.wpPostId && (d.postStatus === 'published' || d.postStatus === 'scheduled')
      )

      if (publishedSiteEntries.length === 0) {
        return NextResponse.json({ success: true, data: { synced: false, exists: false } })
      }

      // 선택적: 특정 사이트만 싱크
      const targetSiteId = request.nextUrl.searchParams.get('wpSiteId')
      const entriesToCheck = targetSiteId
        ? publishedSiteEntries.filter(([id]) => id === targetSiteId)
        : publishedSiteEntries

      let anySynced = false
      const updateObj: Record<string, unknown> = {}

      for (const [siteId, siteData] of entriesToCheck) {
        const connResult = getDecryptedWPConnection(userData as FirestoreUserData, siteId)
        if (!connResult || !siteData.wpPostId) continue

        const exists = await checkWPPostExists(connResult, siteData.wpPostId)
        if (!exists) {
          // WP에서 삭제됨 → 해당 사이트 엔트리 제거
          updateObj[`wordpress.sites.${siteId}`] = FieldValue.delete()
          anySynced = true
        }
      }

      if (anySynced) {
        updateObj['wordpress.publishHistory'] = normalized.publishHistory
        await db.collection('blog_posts').doc(postId).update(updateObj)

        // 남은 사이트 기반으로 overall status 재계산
        const remainingSites = { ...normalized.sites }
        for (const [siteId] of entriesToCheck) {
          if (updateObj[`wordpress.sites.${siteId}`]) {
            delete remainingSites[siteId]
          }
        }
        const overallStatus = getOverallWPStatus(remainingSites)
        const primaryUrl = getPrimaryPublishedUrl(remainingSites)
        const statusUpdate: Record<string, unknown> = {}
        if (overallStatus === 'draft') {
          statusUpdate.status = 'draft'
          statusUpdate.publishedUrl = ''
        } else {
          statusUpdate.publishedUrl = primaryUrl
        }
        if (Object.keys(statusUpdate).length > 0) {
          await db.collection('blog_posts').doc(postId).update(statusUpdate)
        }

        return NextResponse.json({ success: true, data: { synced: true, exists: false } })
      }

      return NextResponse.json({ success: true, data: { synced: false, exists: true } })
    }

    // 기존 동작: wpPostId로 존재 여부만 확인
    const wpPostId = Number(request.nextUrl.searchParams.get('wpPostId'))
    const wpSiteId = request.nextUrl.searchParams.get('wpSiteId')
    if (!wpPostId) {
      return NextResponse.json({ success: true, data: { exists: false } })
    }

    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()
    if (!userData) {
      return NextResponse.json({ success: true, data: { exists: false } })
    }

    const connResult = getDecryptedWPConnection(userData as FirestoreUserData, wpSiteId)
    if (!connResult) {
      return NextResponse.json({ success: true, data: { exists: false } })
    }

    const exists = await checkWPPostExists(connResult, wpPostId)
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
      wpSiteId,
      status = 'publish',
      featuredImageUrl,
      removeFeaturedFromContent = false,
      removeEmptyParagraphs = false,
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

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다. 설정에서 연결해주세요.' },
        { status: 400 }
      )
    }

    const connResult = getDecryptedWPConnection(userData as FirestoreUserData, wpSiteId)
    if (!connResult) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다. 설정에서 연결해주세요.' },
        { status: 400 }
      )
    }

    const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }

    // 3. WordPress 발행
    try {
      let content = postData.content || ''
      let featuredMediaId: number | undefined

      // 빈 줄(&nbsp;) 제거
      if (removeEmptyParagraphs) {
        content = content.replace(/<p[^>]*>\s*(&nbsp;|\u00A0|\s)*\s*<\/p>/gi, '')
      }

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
      const historyEntry = {
        action: isScheduled ? 'scheduled' : 'published',
        timestamp: Timestamp.now(),
        wpPostId: wpPost.id,
        wpPostUrl: wpPost.link,
        wpSiteId: connResult.siteId,
        wpSiteUrl: connResult.siteUrl,
        status,
      }

      // Per-site Firestore 업데이트
      // publishHistory는 arrayUnion으로 병렬 발행 시 race condition 방지
      const wpUpdate: Record<string, unknown> = {
        [`wordpress.sites.${connResult.siteId}.wpPostId`]: wpPost.id,
        [`wordpress.sites.${connResult.siteId}.wpPostUrl`]: wpPost.link,
        [`wordpress.sites.${connResult.siteId}.wpSiteUrl`]: connResult.siteUrl,
        [`wordpress.sites.${connResult.siteId}.publishedAt`]: Timestamp.now(),
        [`wordpress.sites.${connResult.siteId}.errorMessage`]: null,
        [`wordpress.sites.${connResult.siteId}.lastSyncedAt`]: Timestamp.now(),
        'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
      }

      if (isScheduled) {
        wpUpdate[`wordpress.sites.${connResult.siteId}.postStatus`] = 'scheduled'
        wpUpdate[`wordpress.sites.${connResult.siteId}.scheduledAt`] = date ? Timestamp.fromDate(new Date(date)) : Timestamp.now()
      } else {
        wpUpdate[`wordpress.sites.${connResult.siteId}.postStatus`] = 'published'
        wpUpdate.status = 'published'
        wpUpdate.publishedUrl = wpPost.link
      }

      if (slug) wpUpdate[`wordpress.sites.${connResult.siteId}.slug`] = slug
      if (excerpt) wpUpdate[`wordpress.sites.${connResult.siteId}.excerpt`] = excerpt
      if (tags?.length > 0) wpUpdate[`wordpress.sites.${connResult.siteId}.tags`] = tags
      if (categories?.length > 0) wpUpdate[`wordpress.sites.${connResult.siteId}.categories`] = categories
      if (commentStatus) wpUpdate[`wordpress.sites.${connResult.siteId}.commentStatus`] = commentStatus

      // Lazy migration: 기존 flat 필드가 있고 sites가 없으면 flat 필드 제거
      if (postData.wordpress?.wpPostId && !postData.wordpress?.sites) {
        const legacySiteId = postData.wordpress?.wpSiteId || '__legacy__'
        // 기존 flat 데이터를 sites[legacySiteId]로 이동 (현재 발행 사이트와 다른 경우만)
        if (legacySiteId !== connResult.siteId) {
          wpUpdate[`wordpress.sites.${legacySiteId}.postStatus`] = postData.wordpress.postStatus || 'not_published'
          wpUpdate[`wordpress.sites.${legacySiteId}.wpPostId`] = postData.wordpress.wpPostId
          wpUpdate[`wordpress.sites.${legacySiteId}.wpPostUrl`] = postData.wordpress.wpPostUrl || null
          wpUpdate[`wordpress.sites.${legacySiteId}.wpSiteUrl`] = postData.wordpress.wpSiteUrl || null
          wpUpdate[`wordpress.sites.${legacySiteId}.publishedAt`] = postData.wordpress.publishedAt || null
          wpUpdate[`wordpress.sites.${legacySiteId}.lastSyncedAt`] = postData.wordpress.lastSyncedAt || null
          if (postData.wordpress.scheduledAt) wpUpdate[`wordpress.sites.${legacySiteId}.scheduledAt`] = postData.wordpress.scheduledAt
          if (postData.wordpress.slug) wpUpdate[`wordpress.sites.${legacySiteId}.slug`] = postData.wordpress.slug
          if (postData.wordpress.excerpt) wpUpdate[`wordpress.sites.${legacySiteId}.excerpt`] = postData.wordpress.excerpt
          if (postData.wordpress.tags) wpUpdate[`wordpress.sites.${legacySiteId}.tags`] = postData.wordpress.tags
          if (postData.wordpress.categories) wpUpdate[`wordpress.sites.${legacySiteId}.categories`] = postData.wordpress.categories
          if (postData.wordpress.commentStatus) wpUpdate[`wordpress.sites.${legacySiteId}.commentStatus`] = postData.wordpress.commentStatus
        }
        // flat 필드 제거
        wpUpdate['wordpress.wpPostId'] = FieldValue.delete()
        wpUpdate['wordpress.wpPostUrl'] = FieldValue.delete()
        wpUpdate['wordpress.wpSiteId'] = FieldValue.delete()
        wpUpdate['wordpress.wpSiteUrl'] = FieldValue.delete()
        wpUpdate['wordpress.postStatus'] = FieldValue.delete()
        wpUpdate['wordpress.publishedAt'] = FieldValue.delete()
        wpUpdate['wordpress.errorMessage'] = FieldValue.delete()
        wpUpdate['wordpress.lastSyncedAt'] = FieldValue.delete()
        wpUpdate['wordpress.scheduledAt'] = FieldValue.delete()
        wpUpdate['wordpress.slug'] = FieldValue.delete()
        wpUpdate['wordpress.excerpt'] = FieldValue.delete()
        wpUpdate['wordpress.tags'] = FieldValue.delete()
        wpUpdate['wordpress.categories'] = FieldValue.delete()
        wpUpdate['wordpress.commentStatus'] = FieldValue.delete()
      }

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
      // 실패: per-site에 기록
      const errorMessage = postError instanceof Error ? postError.message : '알 수 없는 오류'
      await db.collection('blog_posts').doc(postId).update({
        [`wordpress.sites.${connResult.siteId}.postStatus`]: 'failed',
        [`wordpress.sites.${connResult.siteId}.errorMessage`]: errorMessage,
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
      wpSiteId,
      status = 'publish',
      featuredImageUrl,
      removeFeaturedFromContent = false,
      removeEmptyParagraphs = false,
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

    // 2. per-site 데이터에서 wpPostId 조회
    const normalized = normalizeWordPressData(postData.wordpress)
    const targetSiteId = wpSiteId || postData.wordpress?.wpSiteId
    const siteData = targetSiteId ? normalized.sites[targetSiteId] : undefined
    const wpPostId = siteData?.wpPostId

    if (!wpPostId) {
      return NextResponse.json(
        { success: false, error: 'WordPress에 발행된 글이 없습니다.' },
        { status: 400 }
      )
    }

    // 3. 사용자 WP 연결 정보 확인
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'WordPress가 연결되어 있지 않습니다.' },
        { status: 400 }
      )
    }

    const connResult = getDecryptedWPConnection(userData as FirestoreUserData, targetSiteId)
    if (!connResult) {
      return NextResponse.json(
        { success: false, error: '이 글이 발행된 WordPress 사이트의 연결 정보를 찾을 수 없습니다. 사이트가 삭제되었을 수 있습니다.' },
        { status: 400 }
      )
    }

    const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }

    // 4. WP 글 존재 확인
    const exists = await checkWPPostExists(conn, wpPostId)
    if (!exists) {
      // WP에서 삭제됨 → 해당 사이트 엔트리 제거
      const updateObj: Record<string, unknown> = {
        [`wordpress.sites.${targetSiteId}`]: FieldValue.delete(),
        'wordpress.publishHistory': normalized.publishHistory,
      }
      // 남은 사이트 기반으로 overall status 재계산
      const remainingSites = { ...normalized.sites }
      delete remainingSites[targetSiteId]
      const overallStatus = getOverallWPStatus(remainingSites)
      if (overallStatus === 'draft') {
        updateObj.status = 'draft'
        updateObj.publishedUrl = ''
      } else {
        updateObj.publishedUrl = getPrimaryPublishedUrl(remainingSites)
      }

      await db.collection('blog_posts').doc(postId).update(updateObj)
      return NextResponse.json(
        { success: false, error: 'WordPress 글이 더 이상 존재하지 않습니다. 상태가 초기화되었습니다.' },
        { status: 404 }
      )
    }

    // 5. WordPress 업데이트
    try {
      let content = postData.content || ''
      let featuredMediaId: number | undefined

      // 빈 줄(&nbsp;) 제거
      if (removeEmptyParagraphs) {
        content = content.replace(/<p[^>]*>\s*(&nbsp;|\u00A0|\s)*\s*<\/p>/gi, '')
      }

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
      const historyEntry = {
        action: 'updated',
        timestamp: Timestamp.now(),
        wpPostId: wpPost.id,
        wpPostUrl: wpPost.link,
        wpSiteId: connResult.siteId,
        wpSiteUrl: connResult.siteUrl,
        status,
      }

      const wpUpdate: Record<string, unknown> = {
        [`wordpress.sites.${targetSiteId}.wpPostUrl`]: wpPost.link,
        [`wordpress.sites.${targetSiteId}.lastSyncedAt`]: Timestamp.now(),
        [`wordpress.sites.${targetSiteId}.errorMessage`]: null,
        'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
      }

      if (slug) wpUpdate[`wordpress.sites.${targetSiteId}.slug`] = slug
      if (excerpt !== undefined) wpUpdate[`wordpress.sites.${targetSiteId}.excerpt`] = excerpt
      if (tags?.length > 0) wpUpdate[`wordpress.sites.${targetSiteId}.tags`] = tags
      if (categories?.length > 0) wpUpdate[`wordpress.sites.${targetSiteId}.categories`] = categories
      if (commentStatus) wpUpdate[`wordpress.sites.${targetSiteId}.commentStatus`] = commentStatus

      wpUpdate.publishedUrl = wpPost.link

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

    const { postId, wpSiteId } = await request.json()
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

    const normalized = normalizeWordPressData(postData.wordpress)
    const targetSiteId = wpSiteId || postData.wordpress?.wpSiteId
    const siteData = targetSiteId ? normalized.sites[targetSiteId] : undefined
    const wpPostId = siteData?.wpPostId

    if (!wpPostId) {
      return NextResponse.json(
        { success: false, error: 'WordPress에 발행된 글이 없습니다.' },
        { status: 400 }
      )
    }

    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    if (userData) {
      const connResult = getDecryptedWPConnection(userData as FirestoreUserData, targetSiteId)
      if (connResult) {
        const conn = { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword }
        try {
          await deleteWPPost(conn, wpPostId)
        } catch {
          // WP에서 이미 삭제된 경우(404) 무시 — Firestore 정리는 계속 진행
        }
      }
    }

    // 해당 사이트 엔트리만 삭제 + 이력 보존
    const historyEntry = {
      action: 'deleted',
      timestamp: Timestamp.now(),
      wpPostId,
      wpSiteId: targetSiteId,
      wpSiteUrl: siteData?.wpSiteUrl || null,
    }

    const updateObj: Record<string, unknown> = {
      [`wordpress.sites.${targetSiteId}`]: FieldValue.delete(),
      'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
    }

    // Lazy migration: flat 필드가 남아있으면 제거
    if (postData.wordpress?.wpPostId && !postData.wordpress?.sites) {
      updateObj['wordpress.wpPostId'] = FieldValue.delete()
      updateObj['wordpress.wpPostUrl'] = FieldValue.delete()
      updateObj['wordpress.wpSiteId'] = FieldValue.delete()
      updateObj['wordpress.wpSiteUrl'] = FieldValue.delete()
      updateObj['wordpress.postStatus'] = FieldValue.delete()
      updateObj['wordpress.publishedAt'] = FieldValue.delete()
      updateObj['wordpress.errorMessage'] = FieldValue.delete()
      updateObj['wordpress.lastSyncedAt'] = FieldValue.delete()
      updateObj['wordpress.scheduledAt'] = FieldValue.delete()
      updateObj['wordpress.slug'] = FieldValue.delete()
      updateObj['wordpress.excerpt'] = FieldValue.delete()
      updateObj['wordpress.tags'] = FieldValue.delete()
      updateObj['wordpress.categories'] = FieldValue.delete()
      updateObj['wordpress.commentStatus'] = FieldValue.delete()
    }

    // 남은 사이트 기반으로 overall status 재계산
    const remainingSites = { ...normalized.sites }
    delete remainingSites[targetSiteId]
    const overallStatus = getOverallWPStatus(remainingSites)
    if (overallStatus === 'draft') {
      updateObj.status = 'draft'
      updateObj.publishedUrl = ''
    } else {
      updateObj.publishedUrl = getPrimaryPublishedUrl(remainingSites)
    }

    await db.collection('blog_posts').doc(postId).update(updateObj)

    return NextResponse.json({
      success: true,
      message: 'WordPress 글이 삭제되었습니다.',
    })
  } catch (error) {
    return handleApiError(error)
  }
}
