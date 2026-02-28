import { NextRequest, NextResponse } from 'next/server'

// CORS 허용 도메인 목록 (환경변수 + localhost 자동 허용)
const CORS_ALLOWED_ORIGINS = new Set(
  (process.env.CORS_ALLOWED_ORIGINS ?? '')
    .split(',')
    .map(d => d.trim())
    .filter(Boolean)
)

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  // 개발환경 localhost 자동 허용
  try {
    const url = new URL(origin)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true
  } catch { /* invalid origin */ }
  return CORS_ALLOWED_ORIGINS.has(origin)
}

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowed = isAllowedOrigin(origin)
  return {
    ...(allowed && origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
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
    const origin = request.headers.get('Origin')
    const corsHeaders = getCorsHeaders(origin)

    // Preflight OPTIONS 요청 처리
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 204, headers: corsHeaders })
    }

    // 실제 요청에 CORS 헤더 추가
    const response = NextResponse.next()
    Object.entries(corsHeaders).forEach(([key, value]) => {
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
