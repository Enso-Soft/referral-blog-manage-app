import type { WPSiteInfo_DB } from '@/lib/wordpress-api'

/**
 * Firestore `users` 컬렉션 문서 타입
 *
 * Firebase Auth UID가 문서 ID로 사용됨.
 * 모든 필드는 Firestore 문서에서 읽어올 때 존재하지 않을 수 있으므로
 * 접근 시 optional chaining 권장.
 */
export interface FirestoreUserData {
  // --- 기본 프로필 ---
  email: string
  displayName?: string
  role: 'admin' | 'user'
  status?: 'active' | 'blocked'
  apiKey?: string
  createdAt?: unknown // Firestore Timestamp

  // --- WordPress 연동 (다중 사이트) ---
  wpSites?: Record<string, WPSiteInfo_DB>
  // 레거시 flat 필드 (마이그레이션 전 하위호환)
  wpSiteUrl?: string
  wpUsername?: string
  wpAppPassword?: string
  wpDisplayName?: string

  // --- 크레딧 ---
  sCredit?: number
  eCredit?: number
  lastCheckIn?: unknown // Firestore Timestamp

  // --- Threads 연동 ---
  threadsAccessToken?: string
  threadsTokenExpiresAt?: { toDate?: () => Date } // Firestore Timestamp
  threadsUserId?: string
  threadsUsername?: string
}
