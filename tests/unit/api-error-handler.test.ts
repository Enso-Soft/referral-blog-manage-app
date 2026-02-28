import { describe, it, expect, vi } from 'vitest'
import { ZodError, z } from 'zod'

vi.mock('server-only', () => ({}))
import {
  handleApiError,
  requireAuth,
  requireResource,
  requirePermission,
  requireAdmin,
} from '@/lib/api-error-handler'
import { ApiError, ValidationError, AuthError, AppError } from '@/lib/errors'

describe('handleApiError', () => {
  it('ZodError → 400 VALIDATION_ERROR', async () => {
    const schema = z.object({ name: z.string() })
    let error: ZodError | undefined
    try { schema.parse({}) } catch (e) { error = e as ZodError }

    const response = handleApiError(error!)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.code).toBe('VALIDATION_ERROR')
  })

  it('ApiError.unauthorized → 401', async () => {
    const response = handleApiError(ApiError.unauthorized())
    expect(response.status).toBe(401)
  })

  it('ApiError.forbidden → 403', async () => {
    const response = handleApiError(ApiError.forbidden())
    expect(response.status).toBe(403)
  })

  it('ApiError.notFound → 404', async () => {
    const response = handleApiError(ApiError.notFound())
    expect(response.status).toBe(404)
  })

  it('ApiError.badRequest → 400', async () => {
    const response = handleApiError(ApiError.badRequest('잘못된 요청', '상세'))
    const body = await response.json()
    expect(response.status).toBe(400)
    expect(body.details).toBe('상세')
  })

  it('ValidationError → 400', async () => {
    const response = handleApiError(new ValidationError('검증 실패', 'field1', ['err1']))
    expect(response.status).toBe(400)
  })

  it('AuthError → 401', async () => {
    const response = handleApiError(new AuthError())
    expect(response.status).toBe(401)
  })

  it('AppError → 해당 statusCode', async () => {
    const response = handleApiError(new AppError('커스텀', 'CUSTOM', 503))
    expect(response.status).toBe(503)
  })

  it('일반 Error → 500', async () => {
    const response = handleApiError(new Error('generic'))
    expect(response.status).toBe(500)
  })

  it('unknown → 500', async () => {
    const response = handleApiError('string error')
    expect(response.status).toBe(500)
  })
})

describe('requireAuth', () => {
  it('null이면 throw', () => {
    expect(() => requireAuth(null)).toThrow()
  })

  it('값이 있으면 통과', () => {
    expect(() => requireAuth({ userId: '1' })).not.toThrow()
  })
})

describe('requireResource', () => {
  it('null이면 throw', () => {
    expect(() => requireResource(null)).toThrow()
  })

  it('undefined이면 throw', () => {
    expect(() => requireResource(undefined)).toThrow()
  })

  it('값이 있으면 통과', () => {
    expect(() => requireResource({ id: '1' })).not.toThrow()
  })
})

describe('requirePermission', () => {
  it('false면 throw', () => {
    expect(() => requirePermission(false)).toThrow()
  })

  it('true면 통과', () => {
    expect(() => requirePermission(true)).not.toThrow()
  })
})

describe('requireAdmin', () => {
  it('null이면 throw (401)', () => {
    expect(() => requireAdmin(null)).toThrow()
  })

  it('isAdmin=false면 throw (403)', () => {
    expect(() => requireAdmin({ isAdmin: false })).toThrow()
  })

  it('isAdmin=true면 통과', () => {
    expect(() => requireAdmin({ isAdmin: true })).not.toThrow()
  })
})
