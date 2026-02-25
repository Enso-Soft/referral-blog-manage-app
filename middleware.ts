import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

// 환경변수에서 랜딩 도메인 목록 파싱 (쉼표 구분)
// ex) LANDING_DOMAINS=ensoft.me,enso-soft.xyz,ensoft.xyz
const LANDING_HOSTS = new Set(
  (process.env.LANDING_DOMAINS ?? '')
    .split(',')
    .map(d => d.trim())
    .filter(Boolean)
    .flatMap(d => [d, `www.${d}`])
)

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public API 경로에만 CORS 헤더 적용
  if (pathname.startsWith('/api/public')) {
    // Preflight OPTIONS 요청 처리
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
    }

    // 실제 요청에 CORS 헤더 추가
    const response = NextResponse.next()
    Object.entries(CORS_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    return response
  }

  // API 라우트는 그대로 통과
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // 도메인 기반 라우팅
  const host = request.headers.get('host') ?? ''

  // 랜딩 도메인에 해당하면 → 랜딩 페이지로 rewrite
  if (LANDING_HOSTS.has(host)) {
    const url = request.nextUrl.clone()
    url.pathname = `/landing${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // studio.ensoft.me → 기존 스튜디오 앱 (그대로 통과)
  // localhost → 기존 스튜디오 앱 (그대로 통과), /landing 직접 접근 가능

  return NextResponse.next()
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg).*)',
}
