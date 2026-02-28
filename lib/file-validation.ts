import 'server-only'

/**
 * 서버사이드 파일(이미지) Magic Byte 검증
 * file.type(클라이언트 제공값)은 위조 가능하므로, 실제 바이너리 시그니처로 검증한다.
 */

const MAGIC_BYTES: Record<string, number[][]> = {
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/gif': [
    [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
    [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
  ],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header
}

/**
 * Buffer의 magic byte가 선언된 MIME 타입과 일치하는지 검증
 * @returns true면 유효, false면 위조 의심
 */
export function validateImageBuffer(buffer: Buffer, declaredMimeType: string): boolean {
  // SVG는 텍스트 기반이므로 magic byte 검증 불가 → XML/SVG 태그 존재 여부로 검증 + XSS 패턴 차단
  if (declaredMimeType === 'image/svg+xml') {
    const text = buffer.toString('utf-8').toLowerCase()
    const head = text.substring(0, 256)
    if (!head.includes('<svg') && !head.includes('<?xml')) return false

    // XSS 위험 패턴 차단
    if (/<script[\s>]/i.test(text)) return false
    if (/\bon\w+\s*=/i.test(text)) return false
    if (/javascript\s*:/i.test(text)) return false

    return true
  }

  const signatures = MAGIC_BYTES[declaredMimeType]
  if (!signatures) return false

  return signatures.some((sig) => sig.every((byte, i) => buffer[i] === byte))
}
