import 'server-only'

/**
 * 환경별 로거
 * 개발 환경에서만 상세 로그를 출력하고, 프로덕션에서는 에러만 출력한다.
 * 민감 정보(API 키, 응답 바디 등)가 프로덕션 로그에 노출되지 않도록 한다.
 */

const isDev = process.env.NODE_ENV === 'development'

export const logger = {
  /** 개발 환경에서만 출력 */
  debug(...args: unknown[]) {
    if (isDev) console.log(...args)
  },

  /** 개발 환경에서만 출력 */
  info(...args: unknown[]) {
    if (isDev) console.log(...args)
  },

  /** 항상 출력 (경고) */
  warn(...args: unknown[]) {
    console.warn(...args)
  },

  /** 항상 출력 (에러). 프로덕션에서는 메시지만 출력하고 스택트레이스는 생략 */
  error(message: string, error?: unknown) {
    if (isDev) {
      console.error(message, error)
    } else {
      const errorMessage = error instanceof Error ? error.message : String(error ?? '')
      console.error(message, errorMessage)
    }
  },
}
