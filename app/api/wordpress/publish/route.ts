import { NextResponse } from 'next/server'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { createApiHandler } from '@/lib/api-handler'
import { getOwnedDocument, getDecryptedWPConnection } from '@/lib/api-helpers'
import type { FirestoreUserData } from '@/lib/schemas/user'
import {
  createWPPost, updateWPPost, deleteWPPost, checkWPPostExists,
  migrateImagesToWP,
  normalizeWordPressData,
} from '@/lib/wordpress-api'
import {
  getWPConnection, buildOverallStatusUpdate,
  buildLegacyCleanupUpdate, buildLegacyMigrationUpdate,
  getRemainingAfterDelete,
} from './service'

// GET: 기존 WP 글 존재 여부 확인 + 싱크
export const GET = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const db = getDb()
  const sync = request.nextUrl.searchParams.get('sync') === 'true'
  const postId = request.nextUrl.searchParams.get('postId')

  // sync=true: Firestore 기준으로 WP 글 존재 확인 + 없으면 자동 정리
  if (sync && postId) {
    const { data: postData } = await getOwnedDocument('blog_posts', postId, auth, '게시글')

    const normalized = normalizeWordPressData(postData.wordpress)
    const publishedSiteEntries = Object.entries(normalized.sites).filter(
      ([, d]) => d.wpPostId && (d.postStatus === 'published' || d.postStatus === 'scheduled')
    )

    if (publishedSiteEntries.length === 0) {
      return NextResponse.json({ success: true, data: { synced: false, exists: false } })
    }

    const targetSiteId = request.nextUrl.searchParams.get('wpSiteId')
    const entriesToCheck = targetSiteId
      ? publishedSiteEntries.filter(([id]) => id === targetSiteId)
      : publishedSiteEntries

    let anySynced = false
    const updateObj: Record<string, unknown> = {}

    // 사용자 문서를 한 번만 읽어서 루프 내 N+1 방지
    const userDoc = await db.collection('users').doc(auth.userId).get()
    const userData = userDoc.data()

    for (const [siteId, siteData] of entriesToCheck) {
      if (!userData || !siteData.wpPostId) continue
      const connResult = getDecryptedWPConnection(userData as FirestoreUserData, siteId)
      if (!connResult) continue
      const wpConn = { conn: { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword } }

      const exists = await checkWPPostExists(wpConn.conn, siteData.wpPostId)
      if (!exists) {
        updateObj[`wordpress.sites.${siteId}`] = FieldValue.delete()
        anySynced = true
      }
    }

    if (anySynced) {
      updateObj['wordpress.publishHistory'] = normalized.publishHistory

      const remainingSites = { ...normalized.sites }
      for (const [siteId] of entriesToCheck) {
        if (updateObj[`wordpress.sites.${siteId}`]) delete remainingSites[siteId]
      }

      Object.assign(updateObj, buildOverallStatusUpdate(remainingSites))
      await db.collection('blog_posts').doc(postId).update(updateObj)

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

  const wpConn = await getWPConnection(auth.userId, wpSiteId)
  if (!wpConn) {
    return NextResponse.json({ success: true, data: { exists: false } })
  }

  const exists = await checkWPPostExists(wpConn.conn, wpPostId)
  return NextResponse.json({ success: true, data: { exists } })
})

// POST: WordPress에 발행
export const POST = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const {
    postId, wpSiteId, status = 'publish',
    featuredImageUrl, removeFeaturedFromContent = false, removeEmptyParagraphs = false,
    categories, tags, date, slug, excerpt, commentStatus,
  } = await request.json()

  if (!postId) {
    return NextResponse.json({ success: false, error: 'postId 필드는 필수입니다.' }, { status: 400 })
  }

  const db = getDb()
  const { data: postData } = await getOwnedDocument('blog_posts', postId, auth, '게시글')

  const wpConn = await getWPConnection(auth.userId, wpSiteId)
  if (!wpConn) {
    return NextResponse.json(
      { success: false, error: 'WordPress가 연결되어 있지 않습니다. 설정에서 연결해주세요.' },
      { status: 400 }
    )
  }

  try {
    let content = postData.content || ''
    if (removeEmptyParagraphs) {
      content = content.replace(/<p[^>]*>\s*(&nbsp;|\u00A0|\s)*\s*<\/p>/gi, '')
    }

    const result = await migrateImagesToWP(content, wpConn.conn, { featuredImageUrl, removeFeaturedFromContent })
    content = result.content

    const isScheduled = status === 'future'
    const wpPost = await createWPPost({
      conn: wpConn.conn, title: postData.title, content,
      status: status as 'draft' | 'publish' | 'future',
      featuredMediaId: result.featuredMediaId,
      categories: categories?.length > 0 ? categories : undefined,
      tags: tags?.length > 0 ? tags : undefined,
      date: date || undefined, slug: slug || undefined,
      excerpt: excerpt || undefined, commentStatus: commentStatus || undefined,
    })

    const historyEntry = {
      action: isScheduled ? 'scheduled' : 'published',
      timestamp: Timestamp.now(), wpPostId: wpPost.id, wpPostUrl: wpPost.link,
      wpSiteId: wpConn.siteId, wpSiteUrl: wpConn.siteUrl, status,
    }

    const wpUpdate: Record<string, unknown> = {
      [`wordpress.sites.${wpConn.siteId}.wpPostId`]: wpPost.id,
      [`wordpress.sites.${wpConn.siteId}.wpPostUrl`]: wpPost.link,
      [`wordpress.sites.${wpConn.siteId}.wpSiteUrl`]: wpConn.siteUrl,
      [`wordpress.sites.${wpConn.siteId}.publishedAt`]: Timestamp.now(),
      [`wordpress.sites.${wpConn.siteId}.errorMessage`]: null,
      [`wordpress.sites.${wpConn.siteId}.lastSyncedAt`]: Timestamp.now(),
      'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
    }

    if (isScheduled) {
      wpUpdate[`wordpress.sites.${wpConn.siteId}.postStatus`] = 'scheduled'
      wpUpdate[`wordpress.sites.${wpConn.siteId}.scheduledAt`] = date ? Timestamp.fromDate(new Date(date)) : Timestamp.now()
    } else {
      wpUpdate[`wordpress.sites.${wpConn.siteId}.postStatus`] = 'published'
      wpUpdate.status = 'published'
      wpUpdate.publishedUrl = wpPost.link
    }

    if (slug) wpUpdate[`wordpress.sites.${wpConn.siteId}.slug`] = slug
    if (excerpt) wpUpdate[`wordpress.sites.${wpConn.siteId}.excerpt`] = excerpt
    if (tags?.length > 0) wpUpdate[`wordpress.sites.${wpConn.siteId}.tags`] = tags
    if (categories?.length > 0) wpUpdate[`wordpress.sites.${wpConn.siteId}.categories`] = categories
    if (commentStatus) wpUpdate[`wordpress.sites.${wpConn.siteId}.commentStatus`] = commentStatus

    // 레거시 마이그레이션
    if (postData.wordpress?.wpPostId && !postData.wordpress?.sites) {
      const legacySiteId = postData.wordpress?.wpSiteId || '__legacy__'
      Object.assign(wpUpdate, buildLegacyMigrationUpdate(postData.wordpress, legacySiteId, wpConn.siteId))
      Object.assign(wpUpdate, buildLegacyCleanupUpdate(postData))
    }

    await db.collection('blog_posts').doc(postId).update(wpUpdate)

    return NextResponse.json({
      success: true,
      data: { wpPostId: wpPost.id, wpPostUrl: wpPost.link, postStatus: isScheduled ? 'scheduled' : 'published' },
      message: isScheduled ? 'WordPress에 예약 발행되었습니다.' : 'WordPress에 발행되었습니다.',
    })
  } catch (postError) {
    const errorMessage = postError instanceof Error ? postError.message : '알 수 없는 오류'
    await db.collection('blog_posts').doc(postId).update({
      [`wordpress.sites.${wpConn.siteId}.postStatus`]: 'failed',
      [`wordpress.sites.${wpConn.siteId}.errorMessage`]: errorMessage,
    })
    return NextResponse.json({ success: false, error: `WordPress 발행 실패: ${errorMessage}` }, { status: 500 })
  }
})

// PATCH: WordPress 글 수정
export const PATCH = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const {
    postId, wpSiteId, status = 'publish',
    featuredImageUrl, removeFeaturedFromContent = false, removeEmptyParagraphs = false,
    categories, tags, slug, excerpt, commentStatus,
  } = await request.json()

  if (!postId) {
    return NextResponse.json({ success: false, error: 'postId 필드는 필수입니다.' }, { status: 400 })
  }

  const db = getDb()
  const { data: postData } = await getOwnedDocument('blog_posts', postId, auth, '게시글')

  const normalized = normalizeWordPressData(postData.wordpress)
  const targetSiteId = wpSiteId || postData.wordpress?.wpSiteId
  const siteData = targetSiteId ? normalized.sites[targetSiteId] : undefined
  const wpPostId = siteData?.wpPostId

  if (!wpPostId) {
    return NextResponse.json({ success: false, error: 'WordPress에 발행된 글이 없습니다.' }, { status: 400 })
  }

  const wpConn = await getWPConnection(auth.userId, targetSiteId)
  if (!wpConn) {
    return NextResponse.json(
      { success: false, error: '이 글이 발행된 WordPress 사이트의 연결 정보를 찾을 수 없습니다.' },
      { status: 400 }
    )
  }

  // WP 글 존재 확인
  const exists = await checkWPPostExists(wpConn.conn, wpPostId)
  if (!exists) {
    const { remainingSites } = getRemainingAfterDelete(postData.wordpress, targetSiteId)
    const updateObj: Record<string, unknown> = {
      [`wordpress.sites.${targetSiteId}`]: FieldValue.delete(),
      'wordpress.publishHistory': normalized.publishHistory,
      ...buildOverallStatusUpdate(remainingSites),
    }
    await db.collection('blog_posts').doc(postId).update(updateObj)
    return NextResponse.json(
      { success: false, error: 'WordPress 글이 더 이상 존재하지 않습니다. 상태가 초기화되었습니다.' },
      { status: 404 }
    )
  }

  try {
    let content = postData.content || ''
    if (removeEmptyParagraphs) {
      content = content.replace(/<p[^>]*>\s*(&nbsp;|\u00A0|\s)*\s*<\/p>/gi, '')
    }

    const result = await migrateImagesToWP(content, wpConn.conn, { featuredImageUrl, removeFeaturedFromContent })
    content = result.content

    const wpPost = await updateWPPost({
      conn: wpConn.conn, wpPostId, title: postData.title, content,
      status: status as 'draft' | 'publish' | 'future',
      featuredMediaId: result.featuredMediaId,
      categories: categories?.length > 0 ? categories : undefined,
      tags: tags?.length > 0 ? tags : undefined,
      slug: slug || undefined, excerpt: excerpt !== undefined ? excerpt : undefined,
      commentStatus: commentStatus || undefined,
    })

    const historyEntry = {
      action: 'updated', timestamp: Timestamp.now(),
      wpPostId: wpPost.id, wpPostUrl: wpPost.link,
      wpSiteId: wpConn.siteId, wpSiteUrl: wpConn.siteUrl, status,
    }

    const wpUpdate: Record<string, unknown> = {
      [`wordpress.sites.${targetSiteId}.wpPostUrl`]: wpPost.link,
      [`wordpress.sites.${targetSiteId}.lastSyncedAt`]: Timestamp.now(),
      [`wordpress.sites.${targetSiteId}.errorMessage`]: null,
      'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
      publishedUrl: wpPost.link,
    }

    if (slug) wpUpdate[`wordpress.sites.${targetSiteId}.slug`] = slug
    if (excerpt !== undefined) wpUpdate[`wordpress.sites.${targetSiteId}.excerpt`] = excerpt
    if (tags?.length > 0) wpUpdate[`wordpress.sites.${targetSiteId}.tags`] = tags
    if (categories?.length > 0) wpUpdate[`wordpress.sites.${targetSiteId}.categories`] = categories
    if (commentStatus) wpUpdate[`wordpress.sites.${targetSiteId}.commentStatus`] = commentStatus

    await db.collection('blog_posts').doc(postId).update(wpUpdate)

    return NextResponse.json({
      success: true,
      data: { wpPostId: wpPost.id, wpPostUrl: wpPost.link, postStatus: 'published' },
      message: 'WordPress 글이 업데이트되었습니다.',
    })
  } catch (updateError) {
    const errorMessage = updateError instanceof Error ? updateError.message : '알 수 없는 오류'
    return NextResponse.json({ success: false, error: `WordPress 업데이트 실패: ${errorMessage}` }, { status: 500 })
  }
})

// DELETE: WordPress 글 삭제
export const DELETE = createApiHandler({ auth: 'bearer' }, async (request, { auth }) => {
  const { postId, wpSiteId } = await request.json()
  if (!postId) {
    return NextResponse.json({ success: false, error: 'postId 필드는 필수입니다.' }, { status: 400 })
  }

  const db = getDb()
  const { data: postData } = await getOwnedDocument('blog_posts', postId, auth, '게시글')

  const normalized = normalizeWordPressData(postData.wordpress)
  const targetSiteId = wpSiteId || postData.wordpress?.wpSiteId
  const siteData = targetSiteId ? normalized.sites[targetSiteId] : undefined
  const wpPostId = siteData?.wpPostId

  if (!wpPostId) {
    return NextResponse.json({ success: false, error: 'WordPress에 발행된 글이 없습니다.' }, { status: 400 })
  }

  // WP에서 삭제 시도
  const wpConn = await getWPConnection(auth.userId, targetSiteId)
  if (wpConn) {
    try {
      await deleteWPPost(wpConn.conn, wpPostId)
    } catch {
      // WP에서 이미 삭제된 경우(404) 무시
    }
  }

  const historyEntry = {
    action: 'deleted', timestamp: Timestamp.now(),
    wpPostId, wpSiteId: targetSiteId, wpSiteUrl: siteData?.wpSiteUrl || null,
  }

  const { remainingSites } = getRemainingAfterDelete(postData.wordpress, targetSiteId)
  const updateObj: Record<string, unknown> = {
    [`wordpress.sites.${targetSiteId}`]: FieldValue.delete(),
    'wordpress.publishHistory': FieldValue.arrayUnion(historyEntry),
    ...buildLegacyCleanupUpdate(postData),
    ...buildOverallStatusUpdate(remainingSites),
  }

  await db.collection('blog_posts').doc(postId).update(updateObj)

  return NextResponse.json({ success: true, message: 'WordPress 글이 삭제되었습니다.' })
})
