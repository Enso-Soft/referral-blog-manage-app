import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
})

function getExtension(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  }
  return map[mimeType] || '.jpg'
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 없습니다' },
        { status: 400 }
      )
    }

    // 파일 타입 검증
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: `지원하지 않는 파일 형식입니다: ${file.type}` },
        { status: 400 }
      )
    }

    // 파일 크기 제한 (10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: '파일 크기는 10MB를 초과할 수 없습니다' },
        { status: 400 }
      )
    }

    // S3 키 생성 (날짜 폴더 + UUID)
    const now = new Date()
    const dateFolder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`
    const uniqueId = uuidv4().slice(0, 8)
    const ext = getExtension(file.type)
    const s3Key = `blog/${dateFolder}/${uniqueId}${ext}`

    // 파일을 Buffer로 변환
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // S3 업로드
    const bucket = process.env.AWS_S3_BUCKET || 'referral-blog-images'
    const region = process.env.AWS_REGION || 'ap-northeast-2'

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
      })
    )

    // 퍼블릭 URL 생성
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`

    return NextResponse.json({
      success: true,
      url,
      s3Key,
    })
  } catch (error) {
    console.error('S3 upload error:', error)
    return NextResponse.json(
      { success: false, error: '업로드에 실패했습니다' },
      { status: 500 }
    )
  }
}
