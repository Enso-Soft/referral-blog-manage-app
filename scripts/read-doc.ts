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

const db = admin.firestore()
const docId = process.argv[2] || 'VZShtmkfATftnHd9nm2H'

async function main() {
  const doc = await db.collection('blog_posts').doc(docId).get()
  if (!doc.exists) {
    console.log('Document not found')
    process.exit(1)
  }
  const data = doc.data()!
  console.log('Title:', data.title)
  console.log('Has seoAnalysis:', !!data.seoAnalysis)

  if (data.seoAnalysis) {
    const seo = data.seoAnalysis
    console.log('\n=== seoAnalysis keys ===')
    console.log(Object.keys(seo).join(', '))
    console.log('\nmainKeyword:', JSON.stringify(seo.mainKeyword, null, 2))
    console.log('\nHas keywordCandidates:', !!seo.keywordCandidates)
    console.log('Has trendData:', !!seo.trendData)

    if (seo.searchIntent) {
      console.log('\nsearchIntent:', JSON.stringify(seo.searchIntent, null, 2))
    }
    if (seo.titleOptions) {
      console.log('\ntitleOptions count:', seo.titleOptions.length)
      console.log('titleOptions[0]:', JSON.stringify(seo.titleOptions[0], null, 2))
    }
  }

  process.exit(0)
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
