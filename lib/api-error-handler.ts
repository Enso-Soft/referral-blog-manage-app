import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { AppError, ApiError, ValidationError, AuthError } from './errors'
import { logger } from './logger'

/**
 * API 응답 타입
 */
interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  [key: string]: unknown
}

interface ApiErrorResponse {
  success: false
  error: string
  details?: string
  code?: string
}

type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true, ...data } as ApiSuccessResponse<T>,
    { status }
  )
}

/**
 * 에러 응답 생성
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: string,
  code?: string
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: message,
  }
  if (details) response.details = details
  if (code) response.code = code

  return NextResponse.json(response, { status })
}

/**
 * 에러를 API 응답으로 변환
 */
export function handleApiError(error: unknown): NextResponse<ApiErrorResponse> {
  logger.error('API Error:', error)

  // Zod 검증 에러
  if (error instanceof ZodError) {
    const details = error.issues.map((e) => e.message).join(', ')
    return errorResponse('유효하지 않은 요청입니다', 400, details, 'VALIDATION_ERROR')
  }

  // ValidationError
  if (error instanceof ValidationError) {
    const details = error.errors.length > 0 ? error.errors.join(', ') : error.field
    return errorResponse(error.message, error.statusCode, details, error.code)
  }

  // AuthError
  if (error instanceof AuthError) {
    return errorResponse(error.message, error.statusCode, undefined, error.code)
  }

  // ApiError
  if (error instanceof ApiError) {
    return errorResponse(error.message, error.statusCode, error.details, error.code)
  }

  // AppError
  if (error instanceof AppError) {
    return errorResponse(error.message, error.statusCode, undefined, error.code)
  }

  // 일반 Error
  if (error instanceof Error) {
    // 프로덕션에서는 내부 에러 메시지를 숨김
    const isDev = process.env.NODE_ENV === 'development'
    return errorResponse(
      isDev ? error.message : '서버 오류가 발생했습니다',
      500,
      isDev ? error.stack : undefined
    )
  }

  // 알 수 없는 에러
  return errorResponse('알 수 없는 오류가 발생했습니다', 500)
}

/**
 * API 라우트 핸들러 래퍼
 * try-catch를 자동으로 처리하고 에러를 표준 형식으로 반환
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => handleApiError(error))
}

/**
 * 인증 확인 유틸리티
 * 인증 실패 시 ApiError.unauthorized() throw
 */
export function requireAuth<T>(auth: T | null): asserts auth is T {
  if (!auth) {
    throw ApiError.unauthorized()
  }
}

/**
 * 리소스 존재 확인 유틸리티
 * 리소스가 없으면 ApiError.notFound() throw
 */
export function requireResource<T>(
  resource: T | null | undefined,
  message = '리소스를 찾을 수 없습니다'
): asserts resource is T {
  if (!resource) {
    throw ApiError.notFound(message)
  }
}

/**
 * 권한 확인 유틸리티
 * 권한이 없으면 ApiError.forbidden() throw
 */
export function requirePermission(
  hasPermission: boolean,
  message = '접근 권한이 없습니다'
): void {
  if (!hasPermission) {
    throw ApiError.forbidden(message)
  }
}

/**
 * 관리자 권한 확인 유틸리티
 * 인증 + 관리자 권한을 한 번에 체크
 */
export function requireAdmin<T extends { isAdmin: boolean }>(auth: T | null): asserts auth is T {
  requireAuth(auth)
  requirePermission(auth.isAdmin, '관리자 권한이 필요합니다')
}

export type { ApiResponse, ApiSuccessResponse, ApiErrorResponse }
