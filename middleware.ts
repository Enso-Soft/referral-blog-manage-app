import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  'Access-Control-Max-Age': '86400',
}

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

  // 루트 도메인 → 랜딩 페이지로 rewrite
  const isLandingHost =
    host === 'ensoft.me' || host === 'www.ensoft.me' ||
    host === 'enso-soft.xyz' || host === 'www.enso-soft.xyz'
  if (isLandingHost) {
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
