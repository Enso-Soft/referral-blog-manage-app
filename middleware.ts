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

  // 경로 기반 라우팅 (단일 도메인 studio.ensoft.me):
  //   /       → (landing) 랜딩 페이지
  //   /app/*  → (studio) 서비스 앱
  // 별도 host 기반 rewrite 불필요. 전부 그대로 통과.
  return NextResponse.next()
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.svg).*)',
}
