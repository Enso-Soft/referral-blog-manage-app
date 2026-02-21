import 'server-only'

/**
 * 환경변수 검증 유틸리티
 * 필수 환경변수가 누락되면 명확한 에러 메시지와 함께 즉시 실패한다.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`필수 환경변수가 설정되지 않았습니다: ${name}`)
  }
  return value
}

/** S3 설정 (lazy — 최초 접근 시 검증) */
let _s3Config: { region: string; accessKeyId: string; secretAccessKey: string; bucket: string } | null = null

export function getS3Config() {
  if (!_s3Config) {
    _s3Config = {
      region: requireEnv('S3_REGION'),
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
      bucket: requireEnv('S3_BUCKET'),
    }
  }
  return _s3Config
}
