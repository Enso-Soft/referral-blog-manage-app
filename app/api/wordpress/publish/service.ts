import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from '@/lib/firebase-admin'
import { getDecryptedWPConnection } from '@/lib/api-helpers'
import { normalizeWordPressData, getOverallWPStatus, getPrimaryPublishedUrl } from '@/lib/wordpress-api'
import type { FirestoreUserData } from '@/lib/schemas/user'
import type { WPSitePublishData } from '@/lib/schemas'

/**
 * 사용자의 WordPress 연결 정보 조회 + 복호화
 * @returns { conn, siteId, siteUrl } 또는 null
 */
export async function getWPConnection(userId: string, wpSiteId?: string | null) {
  const db = getDb()
  const userDoc = await db.collection('users').doc(userId).get()
  const userData = userDoc.data()
  if (!userData) return null

  const connResult = getDecryptedWPConnection(userData as FirestoreUserData, wpSiteId)
  if (!connResult) return null

  return {
    conn: { siteUrl: connResult.siteUrl, username: connResult.username, appPassword: connResult.appPassword },
    siteId: connResult.siteId,
    siteUrl: connResult.siteUrl,
  }
}

/**
 * 남은 사이트들로 overall status 재계산 + Firestore 업데이트 객체 생성
 */
export function buildOverallStatusUpdate(remainingSites: Record<string, WPSitePublishData>) {
  const updateObj: Record<string, unknown> = {}
  const overallStatus = getOverallWPStatus(remainingSites)

  if (overallStatus === 'draft') {
    updateObj.status = 'draft'
    updateObj.publishedUrl = ''
  } else {
    updateObj.publishedUrl = getPrimaryPublishedUrl(remainingSites)
  }

  return updateObj
}

/**
 * 레거시 flat 필드 정리용 업데이트 객체 생성
 * wordpress.wpPostId 가 있고 wordpress.sites 가 없는 경우에만 적용
 */
export function buildLegacyCleanupUpdate(postData: Record<string, unknown>) {
  const wp = postData.wordpress as Record<string, unknown> | undefined
  if (!wp?.wpPostId || wp?.sites) return {}

  const fields = [
    'wpPostId', 'wpPostUrl', 'wpSiteId', 'wpSiteUrl',
    'postStatus', 'publishedAt', 'errorMessage',
    'lastSyncedAt', 'scheduledAt', 'slug', 'excerpt',
    'tags', 'categories', 'commentStatus',
  ]

  const updateObj: Record<string, unknown> = {}
  for (const field of fields) {
    updateObj[`wordpress.${field}`] = FieldValue.delete()
  }

  return updateObj
}

/**
 * 레거시 flat 필드 데이터를 새 sites 맵으로 마이그레이션
 * POST 핸들러에서 기존 데이터를 sites[legacySiteId]로 이동할 때 사용
 */
export function buildLegacyMigrationUpdate(
  wp: Record<string, unknown>,
  legacySiteId: string,
  currentSiteId: string
) {
  if (legacySiteId === currentSiteId) return {}

  const updateObj: Record<string, unknown> = {
    [`wordpress.sites.${legacySiteId}.postStatus`]: wp.postStatus || 'not_published',
    [`wordpress.sites.${legacySiteId}.wpPostId`]: wp.wpPostId,
    [`wordpress.sites.${legacySiteId}.wpPostUrl`]: wp.wpPostUrl || null,
    [`wordpress.sites.${legacySiteId}.wpSiteUrl`]: wp.wpSiteUrl || null,
    [`wordpress.sites.${legacySiteId}.publishedAt`]: wp.publishedAt || null,
    [`wordpress.sites.${legacySiteId}.lastSyncedAt`]: wp.lastSyncedAt || null,
  }

  const optionalFields = ['scheduledAt', 'slug', 'excerpt', 'tags', 'categories', 'commentStatus']
  for (const field of optionalFields) {
    if (wp[field]) updateObj[`wordpress.sites.${legacySiteId}.${field}`] = wp[field]
  }

  return updateObj
}

/**
 * 사이트 삭제 후 남은 사이트 계산
 */
export function getRemainingAfterDelete(
  wordpress: Record<string, unknown> | undefined,
  siteIdToDelete: string
) {
  const normalized = normalizeWordPressData(wordpress)
  const remainingSites = { ...normalized.sites }
  delete remainingSites[siteIdToDelete]

  return { normalized, remainingSites }
}
