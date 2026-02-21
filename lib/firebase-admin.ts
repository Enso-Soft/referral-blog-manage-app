import 'server-only'
import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initializeFirebaseAdmin() {
  if (getApps().length > 0) {
    return getFirestore()
  }

  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  let privateKey = process.env.FIREBASE_PRIVATE_KEY

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(`Firebase Admin 환경 변수가 설정되지 않았습니다. projectId: ${!!projectId}, clientEmail: ${!!clientEmail}, privateKey: ${!!privateKey}`)
  }

  // privateKey의 \n 이스케이프 처리 (여러 케이스 대응)
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

  return getFirestore()
}

export function getDb() {
  return initializeFirebaseAdmin()
}
