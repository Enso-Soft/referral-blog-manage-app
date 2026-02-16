import { getAuth } from 'firebase-admin/auth'
import { getApps, initializeApp, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Firebase Admin 초기화 (중복 초기화 방지)
function ensureAdminInitialized() {
  if (getApps().length > 0) {
    return
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin 환경 변수가 설정되지 않았습니다')
  }

  // privateKey의 \n 이스케이프 처리
  if (privateKey.includes('\\n')) {
    privateKey = privateKey.replace(/\\n/g, '\n')
  }

  const serviceAccount: ServiceAccount = {
    projectId,
    clientEmail,
    privateKey,
  }

  initializeApp({
    credential: cert(serviceAccount),
  })
}

// ID 토큰 검증
export async function verifyIdToken(token: string) {
  ensureAdminInitialized()
  const auth = getAuth()
  const decodedToken = await auth.verifyIdToken(token)
  return decodedToken
}

// 사용자 데이터 캐시 (역할 + API 키)
const userDataCache = new Map<string, { role: 'admin' | 'user'; apiKey?: string; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

async function getCachedUserData(userId: string): Promise<{ role: 'admin' | 'user'; apiKey?: string }> {
  const cached = userDataCache.get(userId)
  if (cached && Date.now() < cached.expiry) {
    return { role: cached.role, apiKey: cached.apiKey }
  }

  ensureAdminInitialized()
  const db = getFirestore()
  const userDoc = await db.collection('users').doc(userId).get()

  const role = userDoc.exists && userDoc.data()?.role === 'admin' ? 'admin' : 'user'
  const apiKey = userDoc.exists ? userDoc.data()?.apiKey : undefined

  userDataCache.set(userId, { role, apiKey, expiry: Date.now() + CACHE_TTL })
  return { role, apiKey }
}

// 사용자 역할 확인 (Firestore users 컬렉션에서, 캐싱 적용)
export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { role } = await getCachedUserData(userId)
  return role
}

// 사용자가 Admin인지 확인
export async function isAdmin(userId: string): Promise<boolean> {
  const role = await getUserRole(userId)
  return role === 'admin'
}

// 요청에서 인증 정보 추출 (Bearer Token)
export async function getAuthFromRequest(request: Request): Promise<{
  userId: string
  email: string
  isAdmin: boolean
  apiKey?: string
} | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')

  try {
    const decodedToken = await verifyIdToken(token)
    const { role, apiKey } = await getCachedUserData(decodedToken.uid)

    return {
      userId: decodedToken.uid,
      email: decodedToken.email || '',
      isAdmin: role === 'admin',
      apiKey,
    }
  } catch (error) {
    console.error('Token verification failed:', error)
    return null
  }
}

// API 키로 인증 정보 추출 (X-API-Key 헤더)
export async function getAuthFromApiKey(request: Request): Promise<{
  userId: string
  email: string
  isAdmin: boolean
  apiKey?: string
} | null> {
  const apiKey = request.headers.get('X-API-Key')
  if (!apiKey) {
    return null
  }

  try {
    ensureAdminInitialized()
    const db = getFirestore()
    const snapshot = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get()

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    const data = doc.data()
    const adminStatus = data?.role === 'admin'

    // 캐시에 저장
    userDataCache.set(doc.id, {
      role: adminStatus ? 'admin' : 'user',
      apiKey,
      expiry: Date.now() + CACHE_TTL,
    })

    return {
      userId: doc.id,
      email: data.email || '',
      isAdmin: adminStatus,
      apiKey,
    }
  } catch (error) {
    console.error('API Key verification failed:', error)
    return null
  }
}

// 통합 인증: API Key 또는 Bearer Token 모두 지원
export async function getAuthFromRequestOrApiKey(request: Request): Promise<{
  userId: string
  email: string
  isAdmin: boolean
  apiKey?: string
} | null> {
  // API Key 먼저 확인
  const apiKeyAuth = await getAuthFromApiKey(request)
  if (apiKeyAuth) {
    return apiKeyAuth
  }

  // Bearer Token 확인
  return getAuthFromRequest(request)
}
