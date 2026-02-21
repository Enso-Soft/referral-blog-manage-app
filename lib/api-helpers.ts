/**
 * 공통 API 라우트 유틸리티
 * 반복되는 소유권 검증, 문서 조회 패턴을 추출
 */
import 'server-only'
import { getDb } from '@/lib/firebase-admin'
import { requireResource, requirePermission } from '@/lib/api-error-handler'
import { decrypt } from '@/lib/crypto'
import { getWPConnectionFromUserData } from '@/lib/wordpress-api'
import type { FirestoreUserData } from '@/lib/schemas/user'

interface AuthInfo {
  userId: string
  isAdmin: boolean
}

/**
 * Firestore 문서를 조회하고 소유권을 검증한다.
 * - 문서가 없으면 404 throw
 * - 본인 소유가 아니고 관리자도 아니면 403 throw
 *
 * @param collectionName Firestore 컬렉션 이름
 * @param docId 문서 ID
 * @param auth 인증 정보 (userId, isAdmin)
 * @param resourceLabel 에러 메시지에 사용할 리소스 이름 (예: '게시글', '요청')
 * @returns { docRef, data, doc }
 */
export async function getOwnedDocument(
  collectionName: string,
  docId: string,
  auth: AuthInfo,
  resourceLabel = '리소스'
) {
  const db = getDb()
  const docRef = db.collection(collectionName).doc(docId)
  const doc = await docRef.get()

  requireResource(doc.exists ? doc : null, `${resourceLabel}을(를) 찾을 수 없습니다`)

  const data = doc.data()!
  requirePermission(
    auth.isAdmin || data.userId === auth.userId,
    `이 ${resourceLabel}에 대한 권한이 없습니다`
  )

  return { docRef, data, doc }
}

/**
 * 소유권만 검증 (이미 문서 데이터를 가지고 있을 때)
 */
export function requireOwnership(
  data: { userId?: string },
  auth: AuthInfo,
  resourceLabel = '리소스'
) {
  requirePermission(
    auth.isAdmin || data.userId === auth.userId,
    `이 ${resourceLabel}에 대한 권한이 없습니다`
  )
}

/**
 * getWPConnectionFromUserData + appPassword 복호화.
 * 서버 전용 — 클라이언트에서 사용 불가.
 */
export function getDecryptedWPConnection(
  userData: FirestoreUserData,
  siteId?: string | null
) {
  const conn = getWPConnectionFromUserData(userData, siteId)
  if (!conn) return null
  return { ...conn, appPassword: decrypt(conn.appPassword) }
}
