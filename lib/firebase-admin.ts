import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore()
  }

  // 환경 변수에서 서비스 계정 정보 로드
  const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // privateKey의 \n 이스케이프 처리
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error('Firebase Admin 환경 변수가 설정되지 않았습니다')
  }

  initializeApp({
    credential: cert(serviceAccount),
  })

  return getFirestore()
}

export function getDb() {
  return initializeFirebaseAdmin()
}
