import {
  getAuth,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  type User,
  type Auth,
} from 'firebase/auth'
import { getFirebaseApp } from './firebase'

// Auth 인스턴스 lazy 초기화 (클라이언트에서만)
let auth: Auth | null = null

function getAuthInstance(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth는 클라이언트에서만 사용 가능합니다')
  }

  if (!auth) {
    auth = getAuth(getFirebaseApp())
  }

  return auth
}

// Google 로그인
export async function signInWithGoogle() {
  const authInstance = getAuthInstance()
  const provider = new GoogleAuthProvider()
  const result = await signInWithPopup(authInstance, provider)
  return result.user
}

// Google 로그인 (Redirect 방식 - 팝업 차단 폴백용)
export async function signInWithGoogleRedirect() {
  const authInstance = getAuthInstance()
  const provider = new GoogleAuthProvider()
  await signInWithRedirect(authInstance, provider)
}

// Redirect 로그인 결과 처리 (페이지 로드 시 호출)
export async function getGoogleRedirectResult() {
  const authInstance = getAuthInstance()
  const result = await getRedirectResult(authInstance)
  return result?.user ?? null
}

// 로그아웃
export async function signOut() {
  const authInstance = getAuthInstance()
  await firebaseSignOut(authInstance)
}

// ID 토큰 획득 (API 요청시 사용)
export async function getIdToken(): Promise<string | null> {
  const authInstance = getAuthInstance()
  const user = authInstance.currentUser
  if (!user) return null
  return user.getIdToken()
}

// 인증 상태 변화 감시
export function onAuthChange(callback: (user: User | null) => void) {
  const authInstance = getAuthInstance()
  return onAuthStateChanged(authInstance, callback)
}

