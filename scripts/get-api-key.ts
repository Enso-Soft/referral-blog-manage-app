import * as fs from 'fs'
import * as path from 'path'
import * as admin from 'firebase-admin'

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  const content = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.substring(0, eqIdx).trim()
    let value = trimmed.substring(eqIdx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    env[key] = value.replace(/\\n/g, '\n')
  }
  return env
}

const env = loadEnv()
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  })
}

async function main() {
  const db = admin.firestore()
  const users = await db.collection('users').get()
  for (const doc of users.docs) {
    const data = doc.data()
    if (data.apiKey) {
      console.log(data.apiKey)
      break
    }
  }
  process.exit(0)
}
main()
