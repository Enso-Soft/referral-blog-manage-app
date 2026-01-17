#!/usr/bin/env npx ts-node
/**
 * Migration Script: outputs 폴더의 콘텐츠를 Firestore로 이전
 *
 * 사용법:
 *   npx ts-node scripts/migrate.ts
 *   또는
 *   npm run migrate
 */

import * as fs from 'fs'
import * as path from 'path'
import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// 프로젝트 루트 경로
const PROJECT_ROOT = path.resolve(__dirname, '..', '..')
const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs')
const SERVICE_ACCOUNT_PATH = path.join(
  PROJECT_ROOT,
  'properties',
  'google-services.json'
)

// Firebase Admin 초기화
function initFirebase() {
  const serviceAccount = JSON.parse(
    fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf-8')
  )

  initializeApp({
    credential: cert(serviceAccount),
  })

  return getFirestore()
}

// HTML에서 텍스트 추출
function extractText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
}

// HTML에서 첫 번째 이미지 URL 추출
function extractThumbnail(html: string): string {
  const match = html.match(/<img[^>]+src="([^"]+)"/)
  return match ? match[1] : ''
}

// HTML에서 발췌문 생성
function extractExcerpt(html: string, maxLength = 200): string {
  const text = extractText(html)
  return text.length > maxLength ? text.slice(0, maxLength) + '...' : text
}

// 글자 수 계산
function countWords(html: string): number {
  return extractText(html).length
}

// outputs 폴더 탐색
async function migrateOutputs() {
  const db = initFirebase()
  const collection = db.collection('blog_posts')

  // outputs 폴더 확인
  if (!fs.existsSync(OUTPUTS_DIR)) {
    console.error(`❌ outputs 폴더를 찾을 수 없습니다: ${OUTPUTS_DIR}`)
    process.exit(1)
  }

  // 하위 폴더 목록 가져오기
  const folders = fs
    .readdirSync(OUTPUTS_DIR, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)

  console.log(`📁 ${folders.length}개의 폴더를 발견했습니다.`)

  let migrated = 0
  let skipped = 0
  let failed = 0

  for (const folder of folders) {
    const contentPath = path.join(OUTPUTS_DIR, folder, 'content.html')

    // content.html 파일 확인
    if (!fs.existsSync(contentPath)) {
      console.log(`  ⏭️  ${folder}: content.html 없음, 스킵`)
      skipped++
      continue
    }

    try {
      // HTML 콘텐츠 읽기
      const content = fs.readFileSync(contentPath, 'utf-8')

      // 기존 문서 확인 (중복 방지)
      const existingQuery = await collection
        .where('metadata.originalPath', '==', `outputs/${folder}`)
        .get()

      if (!existingQuery.empty) {
        console.log(`  ⏭️  ${folder}: 이미 마이그레이션됨, 스킵`)
        skipped++
        continue
      }

      // 문서 생성
      const now = Timestamp.now()
      const docData = {
        title: folder,
        content: content,
        excerpt: extractExcerpt(content),
        thumbnail: extractThumbnail(content),
        keywords: [], // 추후 수동 추가
        status: 'draft' as const,
        platform: 'both' as const,
        createdAt: now,
        updatedAt: now,
        metadata: {
          originalPath: `outputs/${folder}`,
          wordCount: countWords(content),
        },
      }

      await collection.add(docData)
      console.log(`  ✅ ${folder}: 마이그레이션 완료 (${docData.metadata.wordCount}자)`)
      migrated++
    } catch (error) {
      console.error(`  ❌ ${folder}: 마이그레이션 실패`, error)
      failed++
    }
  }

  console.log('')
  console.log('='.repeat(50))
  console.log(`📊 마이그레이션 결과:`)
  console.log(`   ✅ 성공: ${migrated}개`)
  console.log(`   ⏭️  스킵: ${skipped}개`)
  console.log(`   ❌ 실패: ${failed}개`)
  console.log('='.repeat(50))
}

// 실행
migrateOutputs()
  .then(() => {
    console.log('✨ 마이그레이션 완료!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('💥 마이그레이션 중 오류 발생:', error)
    process.exit(1)
  })
