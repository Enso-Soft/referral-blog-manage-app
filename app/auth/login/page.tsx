'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, getIdToken } from '@/lib/auth'
import { Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInAppBrowser } from '@/hooks/useInAppBrowser'

const BROWSER_NAMES: Record<string, string> = {
  kakaotalk: '카카오톡',
  naver: '네이버 앱',
  instagram: '인스타그램',
  facebook: '페이스북',
  line: 'LINE',
  other: '앱',
}

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { isInApp, browserType, isAndroid } = useInAppBrowser()

  useEffect(() => {
    const checkRedirectResult = async () => {
      try {
        const { getGoogleRedirectResult, getIdToken: getToken } = await import('@/lib/auth')
        const user = await getGoogleRedirectResult()
        if (!user) return

        setLoading(true)
        const token = await getToken()
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ displayName: user.displayName || '' }),
        })

        router.push('/')
      } catch {
        // redirect 결과 없음 - 무시
      }
    }
    checkRedirectResult()
  }, [router])

  const openExternalBrowser = () => {
    const cleanUrl = `${window.location.origin}/auth/login`

    if (browserType === 'kakaotalk') {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(cleanUrl)}`
      return
    }

    if (isAndroid) {
      const host = window.location.host
      window.location.href = `intent://${host}/auth/login#Intent;scheme=https;package=com.android.chrome;end`
      return
    }

    window.open(cleanUrl, '_blank')
  }

  const handleGoogleLogin = async () => {
    if (isInApp) {
      openExternalBrowser()
      return
    }

    setError(null)
    setLoading(true)

    // Firebase signInWithPopup은 팝업을 그냥 닫으면 Promise가 hang하는 known issue.
    // window focus 이벤트로 팝업이 닫혔음을 감지해 로딩 상태를 해제한다.
    let settled = false
    const handleWindowFocus = () => {
      setTimeout(() => {
        if (!settled) {
          settled = true
          setLoading(false)
        }
      }, 1500)
    }
    window.addEventListener('focus', handleWindowFocus, { once: true })

    try {
      const user = await signInWithGoogle()
      settled = true
      window.removeEventListener('focus', handleWindowFocus)

      const token = await getIdToken()
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName: user.displayName || '' }),
      })

      router.push('/')
    } catch (err: unknown) {
      settled = true
      window.removeEventListener('focus', handleWindowFocus)
      const firebaseErr = err as { code?: string }
      if (
        firebaseErr.code === 'auth/popup-closed-by-user' ||
        firebaseErr.code === 'auth/cancelled-popup-request'
      ) {
        // 팝업 닫기는 에러 메시지 불필요
      } else if (firebaseErr.code === 'auth/popup-blocked') {
        const { signInWithGoogleRedirect } = await import('@/lib/auth')
        await signInWithGoogleRedirect()
        // signInWithRedirect는 페이지를 이동시키므로 이후 코드 실행 안 됨
        return
      } else {
        setError('Google 로그인에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

  const browserName = browserType ? (BROWSER_NAMES[browserType] ?? '앱') : ''

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center mb-6">
            로그인
          </h1>

          <p className="text-gray-500 dark:text-gray-400 text-center mb-6">
            Google 계정으로 로그인하세요
          </p>

          {isInApp && (
            <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg mb-6 text-sm">
              <p className="font-semibold mb-1">외부 브라우저에서 로그인이 진행됩니다</p>
              <p className="text-blue-600 dark:text-blue-400">
                {browserName} 내에서는 Google 보안 정책으로 직접 로그인이 제한됩니다.
                아래 버튼을 누르면 Chrome 또는 Safari에서 자동으로 로그인 페이지가 열립니다.
              </p>
            </div>
          )}

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <Button
            variant="outline"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 h-auto font-medium border-gray-300 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 dark:bg-transparent"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로그인 중...
              </>
            ) : isInApp ? (
              <>
                <ExternalLink className="w-5 h-5 mr-2" />
                외부 브라우저에서 Google 로그인
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google로 로그인
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
