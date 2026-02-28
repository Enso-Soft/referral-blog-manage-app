import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { v4 as uuidv4 } from 'uuid'
import { format } from 'date-fns'
import { validateImageBuffer } from '@/lib/file-validation'
import { getS3Config } from '@/lib/env'
import { createApiHandler } from '@/lib/api-handler'

const SUPPORTED_FORMATS = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']

let _s3Client: S3Client | null = null
function getS3Client() {
  if (!_s3Client) {
    const config = getS3Config()
    _s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })
  }
  return _s3Client
}

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

export const POST = createApiHandler({ auth: 'bearer' }, async (request) => {
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
  const dateFolder = format(new Date(), 'yyyy/MM')
  const uniqueId = uuidv4().slice(0, 8)
  const ext = getExtension(file.type)
  const s3Key = `blog/${dateFolder}/${uniqueId}${ext}`

  // 파일을 Buffer로 변환
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Magic byte 검증 (MIME 위조 방지)
  if (!validateImageBuffer(buffer, file.type)) {
    return NextResponse.json(
      { success: false, error: '파일 내용이 선언된 이미지 형식과 일치하지 않습니다' },
      { status: 400 }
    )
  }

  // Sharp: WebP 변환 + 리사이즈 (SVG, GIF 제외)
  let uploadBuffer: Uint8Array = buffer
  let uploadContentType = file.type
  let uploadKey = s3Key

  const isConvertible = !['image/svg+xml', 'image/gif'].includes(file.type)
  if (isConvertible) {
    uploadBuffer = await sharp(new Uint8Array(buffer))
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer()
    uploadContentType = 'image/webp'
    uploadKey = s3Key.replace(/\.[^.]+$/, '.webp')
  }

  // S3 업로드
  const s3Config = getS3Config()
  const s3Client = getS3Client()

  await s3Client.send(
    new PutObjectCommand({
      Bucket: s3Config.bucket,
      Key: uploadKey,
      Body: uploadBuffer,
      ContentType: uploadContentType,
      CacheControl: 'public, max-age=31536000, immutable',
    })
  )

  // 퍼블릭 URL 생성
  const url = `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${uploadKey}`

  return NextResponse.json({
    success: true,
    url,
    s3Key,
  })
})
