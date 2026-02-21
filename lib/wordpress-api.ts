import { extractImagesFromContent } from '@/lib/url-utils'
import { toDate } from '@/lib/utils'
import type { WPSitePublishData, WPPublishHistoryEntry } from '@/lib/schemas'
import type { FirestoreUserData } from '@/lib/schemas/user'

// --- WordPress 멀티사이트 데이터 정규화 ---

export interface NormalizedWordPressData {
  sites: Record<string, WPSitePublishData>
  publishHistory: WPPublishHistoryEntry[]
}

/**
 * Firestore에서 읽은 wordpress 필드를 정규화.
 * - sites가 있으면 그대로 반환 (신규 형식)
 * - wpPostId만 있으면 sites[wpSiteId || '__legacy__']로 변환
 * - 둘 다 없으면 빈 객체 반환
 */
export function normalizeWordPressData(wp: Record<string, unknown> | undefined | null): NormalizedWordPressData {
  if (!wp) return { sites: {}, publishHistory: [] }

  const publishHistory = (wp.publishHistory || []) as WPPublishHistoryEntry[]

  // 이미 신규 형식
  if (wp.sites && typeof wp.sites === 'object') {
    return {
      sites: wp.sites as Record<string, WPSitePublishData>,
      publishHistory,
    }
  }

  // 레거시 flat 필드 → sites 맵으로 변환
  if (wp.wpPostId) {
    const siteId = (wp.wpSiteId as string) || '__legacy__'
    return {
      sites: {
        [siteId]: {
          postStatus: (wp.postStatus as WPSitePublishData['postStatus']) || 'not_published',
          wpPostId: wp.wpPostId as number,
          wpPostUrl: wp.wpPostUrl as string | undefined,
          wpSiteUrl: wp.wpSiteUrl as string | undefined,
          publishedAt: wp.publishedAt as WPSitePublishData['publishedAt'],
          errorMessage: wp.errorMessage as string | undefined,
          lastSyncedAt: wp.lastSyncedAt as WPSitePublishData['lastSyncedAt'],
          scheduledAt: wp.scheduledAt as WPSitePublishData['scheduledAt'],
          slug: wp.slug as string | undefined,
          excerpt: wp.excerpt as string | undefined,
          tags: wp.tags as number[] | undefined,
          categories: wp.categories as number[] | undefined,
          commentStatus: wp.commentStatus as WPSitePublishData['commentStatus'],
        },
      },
      publishHistory,
    }
  }

  return { sites: {}, publishHistory }
}

function timestampToMsHelper(ts: unknown): number {
  return toDate(ts)?.getTime() ?? 0
}

/**
 * 모든 사이트 중 overall WP 상태 반환.
 * 하나라도 published/scheduled이면 'published', 아니면 'draft'
 */
export function getOverallWPStatus(sites: Record<string, WPSitePublishData>): 'published' | 'draft' {
  for (const data of Object.values(sites)) {
    if (data.postStatus === 'published' || data.postStatus === 'scheduled') {
      return 'published'
    }
  }
  return 'draft'
}

/**
 * 가장 최근 발행된 사이트의 URL 반환
 */
export function getPrimaryPublishedUrl(sites: Record<string, WPSitePublishData>): string {
  let latestMs = 0
  let latestUrl = ''
  for (const data of Object.values(sites)) {
    if (data.wpPostUrl && (data.postStatus === 'published' || data.postStatus === 'scheduled')) {
      const ms = timestampToMsHelper(data.publishedAt)
      if (ms > latestMs) {
        latestMs = ms
        latestUrl = data.wpPostUrl
      }
    }
  }
  // fallback: latestMs가 0이면 첫 번째 published URL
  if (!latestUrl) {
    for (const data of Object.values(sites)) {
      if (data.wpPostUrl && (data.postStatus === 'published' || data.postStatus === 'scheduled')) {
        return data.wpPostUrl
      }
    }
  }
  return latestUrl
}

export interface WPConnection {
  siteUrl: string
  username: string
  appPassword: string
}

// --- 다중 사이트 헬퍼 ---

export interface WPSiteInfo_DB {
  siteUrl: string
  username: string
  appPassword: string
  displayName?: string
  connectedAt?: unknown
}

export interface WPSiteSummary {
  id: string
  siteUrl: string
  displayName?: string
  connectedAt?: unknown
}

/**
 * userData에서 특정 siteId의 WPConnection을 반환.
 * - siteId로 wpSites[siteId] 조회
 * - siteId 없으면 레거시 flat 필드 폴백
 * - 둘 다 없으면 wpSites 첫 번째 사이트
 * - 못 찾으면 null
 */
export function getWPConnectionFromUserData(
  userData: FirestoreUserData,
  siteId?: string | null
): (WPConnection & { siteId: string; siteUrl: string }) | null {
  const wpSites = userData.wpSites

  // 1. siteId로 직접 조회
  if (siteId && wpSites?.[siteId]) {
    const site = wpSites[siteId]
    return {
      siteUrl: site.siteUrl,
      username: site.username,
      appPassword: site.appPassword,
      siteId,
    }
  }

  // 2. 레거시 flat 필드 폴백
  if (userData.wpSiteUrl && userData.wpUsername && userData.wpAppPassword) {
    return {
      siteUrl: userData.wpSiteUrl,
      username: userData.wpUsername,
      appPassword: userData.wpAppPassword,
      siteId: '__legacy__',
    }
  }

  // 3. wpSites의 첫 번째 사이트
  if (wpSites) {
    const entries = Object.entries(wpSites)
    if (entries.length > 0) {
      const [firstId, firstSite] = entries[0]
      return {
        siteUrl: firstSite.siteUrl,
        username: firstSite.username,
        appPassword: firstSite.appPassword,
        siteId: firstId,
      }
    }
  }

  return null
}

/**
 * userData에서 모든 WP 사이트 목록 반환 (connectedAt 정렬).
 * 레거시 flat 필드만 있으면 id: '__legacy__'로 포함.
 */
export function getAllWPSitesFromUserData(
  userData: FirestoreUserData
): WPSiteSummary[] {
  const sites: WPSiteSummary[] = []
  const wpSites = userData.wpSites

  if (wpSites) {
    for (const [id, site] of Object.entries(wpSites)) {
      sites.push({
        id,
        siteUrl: site.siteUrl,
        displayName: site.displayName,
        connectedAt: site.connectedAt,
      })
    }
  }

  // 레거시 flat 필드 (wpSites에 이미 마이그레이션되지 않은 경우만)
  if (sites.length === 0 && userData.wpSiteUrl && userData.wpUsername && userData.wpAppPassword) {
    sites.push({
      id: '__legacy__',
      siteUrl: userData.wpSiteUrl,
      displayName: userData.wpDisplayName || undefined,
    })
  }

  return sites
}

interface WPUserInfo {
  id: number
  name: string
  slug: string
  url: string
}

interface WPPost {
  id: number
  link: string
  status: string
}

interface WPMedia {
  id: number
  source_url: string
}

export interface WPCategory {
  id: number
  name: string
  slug: string
  parent: number
  count: number
}

function getAuthHeader(conn: WPConnection): string {
  return 'Basic ' + Buffer.from(`${conn.username}:${conn.appPassword}`).toString('base64')
}

export function normalizeUrl(siteUrl: string): string {
  let url = siteUrl.trim()

  // 프로토콜 없으면 https:// 추가
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }

  try {
    const parsed = new URL(url)
    let pathname = parsed.pathname

    // WordPress 내부 경로 제거 → 베이스 URL 추출
    const wpPaths = ['/wp-admin', '/wp-login', '/wp-content', '/wp-includes', '/wp-json', '/wp-cron', '/xmlrpc.php']
    for (const wpPath of wpPaths) {
      const idx = pathname.indexOf(wpPath)
      if (idx !== -1) {
        pathname = pathname.substring(0, idx)
        break
      }
    }

    return (parsed.origin + pathname).replace(/\/+$/, '')
  } catch {
    return url.replace(/\/+$/, '')
  }
}

interface WPSiteInfo {
  name?: string
  url?: string
  description?: string
}

export async function detectWordPress(siteUrl: string): Promise<WPSiteInfo> {
  const baseUrl = normalizeUrl(siteUrl)

  try {
    const res = await fetch(`${baseUrl}/wp-json/`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      throw new Error('WordPress 사이트를 감지할 수 없습니다. URL을 확인해주세요.')
    }

    const data = await res.json()
    if (!data?.namespaces || !Array.isArray(data.namespaces) || !data.namespaces.includes('wp/v2')) {
      throw new Error('WordPress 사이트를 감지할 수 없습니다. URL을 확인해주세요.')
    }

    return {
      name: data.name,
      url: data.url,
      description: data.description,
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('WordPress')) {
      throw error
    }
    throw new Error('WordPress 사이트를 감지할 수 없습니다. URL을 확인해주세요.')
  }
}

export async function getWPCategories(conn: WPConnection): Promise<WPCategory[]> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  const categories: WPCategory[] = []
  let page = 1

  // WP REST API는 페이지네이션 — 전부 가져오기
  while (true) {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/categories?per_page=100&page=${page}`, {
      headers: { 'Authorization': getAuthHeader(conn) },
    })
    if (!res.ok) break
    const data: WPCategory[] = await res.json()
    categories.push(...data)
    if (data.length < 100) break
    page++
  }

  return categories
}

export async function validateWPConnection(conn: WPConnection): Promise<WPUserInfo> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  const res = await fetch(`${baseUrl}/wp-json/wp/v2/users/me`, {
    headers: {
      'Authorization': getAuthHeader(conn),
    },
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    if (res.status === 401) {
      throw new Error('인증에 실패했습니다. 사용자명과 앱 비밀번호를 확인해주세요.')
    }
    throw new Error(error?.message || 'WordPress 연결에 실패했습니다.')
  }

  return res.json()
}

export async function createWPPost(params: {
  conn: WPConnection
  title: string
  content: string
  status: 'draft' | 'publish' | 'future'
  featuredMediaId?: number
  categories?: number[]
  tags?: number[]
  date?: string
  slug?: string
  excerpt?: string
  commentStatus?: 'open' | 'closed'
}): Promise<WPPost> {
  const baseUrl = normalizeUrl(params.conn.siteUrl)

  const body: Record<string, unknown> = {
    title: params.title,
    content: params.content,
    status: params.status,
  }

  if (params.featuredMediaId) {
    body.featured_media = params.featuredMediaId
  }

  if (params.categories && params.categories.length > 0) {
    body.categories = params.categories
  }

  if (params.tags && params.tags.length > 0) {
    body.tags = params.tags
  }

  if (params.date) {
    body.date = params.date
  }

  if (params.slug) {
    body.slug = params.slug
  }

  if (params.excerpt) {
    body.excerpt = params.excerpt
  }

  if (params.commentStatus) {
    body.comment_status = params.commentStatus
  }

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(params.conn),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.message || 'WordPress 글 생성에 실패했습니다.')
  }

  return res.json()
}

export async function updateWPPost(params: {
  conn: WPConnection
  wpPostId: number
  title: string
  content: string
  status: 'draft' | 'publish' | 'future'
  featuredMediaId?: number
  categories?: number[]
  tags?: number[]
  date?: string
  slug?: string
  excerpt?: string
  commentStatus?: 'open' | 'closed'
}): Promise<WPPost> {
  const baseUrl = normalizeUrl(params.conn.siteUrl)

  const body: Record<string, unknown> = {
    title: params.title,
    content: params.content,
    status: params.status,
  }

  if (params.featuredMediaId) {
    body.featured_media = params.featuredMediaId
  }

  if (params.categories && params.categories.length > 0) {
    body.categories = params.categories
  }

  if (params.tags && params.tags.length > 0) {
    body.tags = params.tags
  }

  if (params.date) {
    body.date = params.date
  }

  if (params.slug) {
    body.slug = params.slug
  }

  if (params.excerpt !== undefined) {
    body.excerpt = params.excerpt
  }

  if (params.commentStatus) {
    body.comment_status = params.commentStatus
  }

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${params.wpPostId}`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(params.conn),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.message || 'WordPress 글 수정에 실패했습니다.')
  }

  return res.json()
}

export interface WPTag {
  id: number
  name: string
  slug: string
  count: number
}

export async function getWPTags(conn: WPConnection): Promise<WPTag[]> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  const tags: WPTag[] = []
  let page = 1

  while (true) {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/tags?per_page=100&page=${page}`, {
      headers: { 'Authorization': getAuthHeader(conn) },
    })
    if (!res.ok) break
    const data: WPTag[] = await res.json()
    tags.push(...data)
    if (data.length < 100) break
    page++
  }

  return tags
}

export async function createWPTag(conn: WPConnection, name: string): Promise<WPTag> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  const res = await fetch(`${baseUrl}/wp-json/wp/v2/tags`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(conn),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name }),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.message || '태그 생성에 실패했습니다.')
  }

  return res.json()
}

export async function checkWPPostExists(conn: WPConnection, wpPostId: number): Promise<boolean> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  try {
    const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${wpPostId}?context=edit`, {
      headers: { 'Authorization': getAuthHeader(conn) },
    })
    if (!res.ok) return false
    const data = await res.json()
    // 휴지통에 있는 글은 삭제된 것으로 처리
    return data.status !== 'trash'
  } catch {
    return false
  }
}

export async function deleteWPPost(conn: WPConnection, wpPostId: number): Promise<void> {
  const baseUrl = normalizeUrl(conn.siteUrl)
  const res = await fetch(`${baseUrl}/wp-json/wp/v2/posts/${wpPostId}?force=true`, {
    method: 'DELETE',
    headers: { 'Authorization': getAuthHeader(conn) },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.message || 'WordPress 글 삭제에 실패했습니다.')
  }
}

export async function uploadWPMedia(params: {
  conn: WPConnection
  imageBuffer: ArrayBuffer
  filename: string
  contentType: string
}): Promise<WPMedia> {
  const baseUrl = normalizeUrl(params.conn.siteUrl)

  const res = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: 'POST',
    headers: {
      'Authorization': getAuthHeader(params.conn),
      'Content-Disposition': `attachment; filename="${params.filename}"`,
      'Content-Type': params.contentType,
    },
    body: new Uint8Array(params.imageBuffer),
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({}))
    throw new Error(error?.message || '이미지 업로드에 실패했습니다.')
  }

  return res.json()
}

async function downloadAndUploadImage(
  imageUrl: string,
  conn: WPConnection
): Promise<WPMedia> {
  const res = await fetch(imageUrl)
  if (!res.ok) {
    throw new Error(`이미지 다운로드 실패: ${imageUrl}`)
  }

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const arrayBuffer = await res.arrayBuffer()

  const urlPath = new URL(imageUrl).pathname
  const filename = urlPath.split('/').pop() || `image_${Date.now()}.jpg`

  return uploadWPMedia({
    conn,
    imageBuffer: arrayBuffer,
    filename,
    contentType,
  })
}

export async function migrateImagesToWP(
  content: string,
  conn: WPConnection,
  options?: {
    featuredImageUrl?: string
    removeFeaturedFromContent?: boolean
  }
): Promise<{ content: string; featuredMediaId?: number }> {
  const imageUrls = extractImagesFromContent(content)
  if (imageUrls.length === 0) {
    return { content }
  }

  let featuredMediaId: number | undefined
  let updatedContent = content

  const results = await Promise.allSettled(
    imageUrls.map(async (url) => {
      const media = await downloadAndUploadImage(url, conn)
      return { originalUrl: url, media }
    })
  )

  // 사용자가 지정한 대표 이미지 URL (없으면 첫 번째 이미지)
  const targetFeaturedUrl = options?.featuredImageUrl || imageUrls[0]

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    if (result.status === 'fulfilled') {
      const { originalUrl, media } = result.value
      updatedContent = updatedContent.split(originalUrl).join(media.source_url)
      if (originalUrl === targetFeaturedUrl) {
        featuredMediaId = media.id
      }
    }
  }

  // 대표 이미지를 본문에서 제거
  if (options?.removeFeaturedFromContent && featuredMediaId) {
    // WP URL로 치환된 후이므로, featuredMediaId에 해당하는 WP URL 찾기
    const featuredResult = results.find(
      (r) => r.status === 'fulfilled' && r.value.originalUrl === targetFeaturedUrl
    )
    if (featuredResult?.status === 'fulfilled') {
      const wpUrl = featuredResult.value.media.source_url
      // <img> 태그 전체 제거 (해당 URL 포함)
      updatedContent = updatedContent.replace(
        new RegExp(`<img[^>]+src=["']${wpUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'][^>]*\\/?>`, 'g'),
        ''
      )
    }
  }

  return { content: updatedContent, featuredMediaId }
}
