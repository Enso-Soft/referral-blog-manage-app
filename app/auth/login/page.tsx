'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signInWithGoogle, getIdToken } from '@/lib/auth'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInAppBrowser } from '@/hooks/useInAppBrowser'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isInAppBrowser = useInAppBrowser()

  const handleGoogleLogin = async () => {
    if (isInAppBrowser) {
      setError('보안상 인앱 브라우저에서는 Google 로그인을 지원하지 않습니다. 외부 브라우저(Chrome, Safari 등)에서 열어주세요.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const user = await signInWithGoogle()

      // ID 토큰 획득 후 users 문서 생성 (신규 유저인 경우)
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
      console.error('Google login error:', err)
      const firebaseErr = err as { code?: string }
      if (firebaseErr.code === 'auth/popup-closed-by-user') {
        setError('로그인이 취소되었습니다')
      } else if (firebaseErr.code === 'auth/popup-blocked') {
        setError('팝업이 차단되었습니다. 팝업 차단을 해제해주세요')
      } else {
        setError('Google 로그인에 실패했습니다')
      }
    } finally {
      setLoading(false)
    }
  }

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

          {isInAppBrowser && (
            <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 p-4 rounded-lg mb-6 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">인앱 브라우저 감지됨</p>
                <p>
                  Google 보안 정책으로 인해 현재 브라우저에서는 로그인이 제한될 수 있습니다.
                  <br />
                  화면의 메뉴 버튼(통상 우측 하단/상단 점 3개)을 눌러 <strong>'다른 브라우저로 열기'</strong>를 선택해주세요.
                </p>
              </div>
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
            disabled={loading || isInAppBrowser}
            className={`w-full py-3 px-4 h-auto font-medium ${isInAppBrowser ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                로그인 중...
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
