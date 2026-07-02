import { NextRequest, NextResponse } from 'next/server'
import { lookup } from 'dns/promises'
import { isIP } from 'net'
import { logger } from '@/lib/logger'

/**
 * IPv4/IPv6 문자열이 사설/루프백/링크로컬 등 내부 대역인지 판별.
 * SSRF 방어용 — 클라우드 메타데이터(169.254.169.254), localhost, 사내망 차단.
 */
function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip)

  if (kind === 4) {
    const parts = ip.split('.').map(Number)
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return true // 파싱 불가한 값은 안전하게 차단
    }
    const [a, b] = parts
    if (a === 0) return true // 0.0.0.0/8
    if (a === 10) return true // 10.0.0.0/8
    if (a === 127) return true // 루프백
    if (a === 169 && b === 254) return true // 링크로컬 (메타데이터 포함)
    if (a === 172 && b >= 16 && b <= 31) return true // 172.16.0.0/12
    if (a === 192 && b === 168) return true // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true // CGNAT 100.64.0.0/10
    if (a === 192 && b === 0) return true // 192.0.0.0/24 등 예약
    if (a === 198 && (b === 18 || b === 19)) return true // 198.18.0.0/15 벤치마크
    if (a >= 224) return true // 멀티캐스트/예약 224.0.0.0+
    return false
  }

  if (kind === 6) {
    const addr = ip.toLowerCase()
    if (addr === '::1' || addr === '::') return true // 루프백/미지정
    // IPv4-mapped (::ffff:a.b.c.d) → 내부 IPv4로 재검사
    const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    if (mapped) return isPrivateAddress(mapped[1])
    if (addr.startsWith('fc') || addr.startsWith('fd')) return true // fc00::/7 유니크 로컬
    if (addr.startsWith('fe8') || addr.startsWith('fe9') || addr.startsWith('fea') || addr.startsWith('feb')) return true // fe80::/10 링크로컬
    if (addr.startsWith('ff')) return true // 멀티캐스트
    return false
  }

  // isIP === 0: IP 리터럴이 아님 (호출부에서 DNS 조회 후 판별)
  return false
}

/**
 * 대상 URL이 외부로 나가도 안전한지 검사한다 (SSRF 방어).
 * - http/https만 허용
 * - 호스트가 IP 리터럴이면 즉시 대역 검사
 * - 도메인이면 DNS 조회 후 모든 해석 주소를 검사
 */
async function isSafeUrl(raw: string): Promise<boolean> {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false

  const host = parsed.hostname

  if (isIP(host)) {
    return !isPrivateAddress(host)
  }

  try {
    const results = await lookup(host, { all: true })
    if (results.length === 0) return false
    return results.every((r) => !isPrivateAddress(r.address))
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 })
  }

  // SSRF 방어: 내부/사설 대상으로의 프록시 요청 차단
  if (!(await isSafeUrl(url))) {
    logger.warn('Download blocked (unsafe target):', url)
    return NextResponse.json({ error: 'Invalid or disallowed URL' }, { status: 400 })
  }

  try {
    const response = await fetch(url, {
      redirect: 'error', // 리다이렉트로 내부 대역 우회하는 것을 방지
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BlogEditor/1.0)',
      },
    })

    if (!response.ok) {
      logger.error('Fetch failed:', `${response.status} ${response.statusText} ${url}`)
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 500 })
    }

    const arrayBuffer = await response.arrayBuffer()
    const customFileName = request.nextUrl.searchParams.get('filename')
    const fileName = customFileName || url.split('/').pop() || 'image.jpg'

    // RFC 5987 형식으로 파일명 인코딩 (한글 등 비ASCII 문자 지원)
    const encodedFileName = encodeURIComponent(fileName).replace(/['()]/g, escape)
    // ASCII 파일명은 안전한 문자만 포함하도록 변환
    const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '\\"')
    const contentDisposition = `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodedFileName}`

    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error('Download error:', `${errorMessage} URL: ${url}`)
    return NextResponse.json({ error: 'Download failed', details: errorMessage }, { status: 500 })
  }
}
