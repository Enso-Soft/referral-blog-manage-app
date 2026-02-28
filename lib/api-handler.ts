import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthFromRequest, getAuthFromApiKey, getAuthFromRequestOrApiKey } from '@/lib/auth-admin'
import { handleApiError, requireAuth, requireAdmin } from '@/lib/api-error-handler'

type AuthMode = 'bearer' | 'apiKey' | 'both' | 'none'

interface AuthResult {
  userId: string
  email: string
  isAdmin: boolean
  apiKey?: string
}

interface HandlerOptionsWithAuth {
  auth?: 'bearer' | 'apiKey' | 'both'
  admin?: boolean
}

interface HandlerOptionsNoAuth {
  auth: 'none'
  admin?: false
}

type AuthedHandlerFn = (
  request: NextRequest,
  context: { auth: AuthResult; params?: Record<string, string> }
) => Promise<NextResponse>

type NoAuthHandlerFn = (
  request: NextRequest,
  context: { auth: null; params?: Record<string, string> }
) => Promise<NextResponse>

/**
 * API 라우트 핸들러 래퍼
 * 인증 + 에러 처리를 통합하여 반복 코드 제거
 */
export function createApiHandler(
  options: HandlerOptionsWithAuth,
  handler: AuthedHandlerFn
): (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
export function createApiHandler(
  options: HandlerOptionsNoAuth,
  handler: NoAuthHandlerFn
): (request: NextRequest, routeContext: { params: Promise<Record<string, string>> }) => Promise<NextResponse>
export function createApiHandler(
  options: HandlerOptionsWithAuth | HandlerOptionsNoAuth,
  handler: AuthedHandlerFn | NoAuthHandlerFn
) {
  return async (
    request: NextRequest,
    routeContext: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      let auth: AuthResult | null = null
      const authMode: AuthMode = options.auth ?? 'bearer'

      switch (authMode) {
        case 'bearer':
          auth = await getAuthFromRequest(request)
          break
        case 'apiKey':
          auth = await getAuthFromApiKey(request)
          break
        case 'both':
          auth = await getAuthFromRequestOrApiKey(request)
          break
        case 'none':
          break
      }

      if (authMode !== 'none') {
        if (options.admin) {
          requireAdmin(auth)
        } else {
          requireAuth(auth)
        }
      }

      // params 해제 (Next.js 15 async params)
      const params = routeContext?.params ? await routeContext.params : undefined

      return await (handler as AuthedHandlerFn)(request, { auth: auth as AuthResult, params })
    } catch (error) {
      return handleApiError(error)
    }
  }
}
